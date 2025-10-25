/** biome-ignore-all lint/correctness/useExhaustiveDependencies: ok */
"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { useQueryNormalizer } from "@normy/react-query";
import { useQuery } from "@tanstack/react-query";
import {
	type Column,
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type OnChangeFn,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTRPC } from "@/lib/trpc/client";

type ContactsPageContentProps = {
	websiteSlug: string;
};

type ContactRow = RouterOutputs["contact"]["list"]["items"][number];

type ContactDetail = RouterOutputs["contact"]["get"];

const PAGE_SIZE_OPTIONS = ["10", "25", "50"] as const;

type ContactSortField =
	| "name"
	| "email"
	| "createdAt"
	| "updatedAt"
	| "visitorCount";

export function ContactsPageContent({ websiteSlug }: ContactsPageContentProps) {
	const trpc = useTRPC();
	const queryNormalizer = useQueryNormalizer();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(25);
	const [searchTerm, setSearchTerm] = useState("");
	const debouncedSearch = useDebouncedValue(searchTerm.trim(), 300);
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "updatedAt", desc: true },
	]);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [selectedContactId, setSelectedContactId] = useState<string | null>(
		null
	);

	useEffect(() => {
		setPage(1);
	}, [debouncedSearch]);

	const activeSort = sorting[0];
	const sortBy = activeSort?.id as ContactSortField | undefined;
	const sortOrder = activeSort ? (activeSort.desc ? "desc" : "asc") : undefined;

	const listQuery = useQuery({
		...trpc.contact.list.queryOptions({
			websiteSlug,
			page,
			limit: pageSize,
			search: debouncedSearch || undefined,
			sortBy,
			sortOrder,
		}),
	});

	const totalCount = listQuery.data?.totalCount ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

	useEffect(() => {
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [page, totalPages]);

	const contactPlaceholder = useMemo<ContactDetail | undefined>(() => {
		if (!selectedContactId) {
			return;
		}

		return queryNormalizer.getObjectById<ContactDetail>(selectedContactId);
	}, [queryNormalizer, selectedContactId]);

	const contactDetailQuery = useQuery({
		...trpc.contact.get.queryOptions({
			websiteSlug,
			contactId: selectedContactId ?? "",
		}),
		enabled: sheetOpen && Boolean(selectedContactId),
		placeholderData: contactPlaceholder,
	});

	const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
		setSorting((prev) => {
			const next = typeof updater === "function" ? updater(prev) : updater;
			return next.length > 0 ? next : [{ id: "updatedAt", desc: true }];
		});
		setPage(1);
	};

	const handleRowClick = (contactId: string) => {
		setSelectedContactId(contactId);
		setSheetOpen(true);
	};

	const handleOpenChange = (nextOpen: boolean) => {
		setSheetOpen(nextOpen);
		if (!nextOpen) {
			setSelectedContactId(null);
		}
	};

	const handlePageChange = (nextPage: number) => {
		const cappedPage = Math.min(
			Math.max(nextPage, 1),
			Math.max(1, Math.ceil(totalCount / pageSize))
		);
		setPage(cappedPage);
	};

	const handlePageSizeChange = (value: string) => {
		const nextSize = Number.parseInt(value, 10);
		setPageSize(nextSize);
		setPage(1);
	};

	const pageStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
	const pageEnd = totalCount === 0 ? 0 : Math.min(totalCount, page * pageSize);

	return (
		<Page className="relative flex flex-col gap-6">
			<PageHeader className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<PageHeaderTitle>Contacts</PageHeaderTitle>
			</PageHeader>
			<div className="mt-2 flex flex-col gap-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="w-full max-w-md">
						<Input
							append={
								listQuery.isFetching ? (
									<Spinner className="h-4 w-4" />
								) : undefined
							}
							aria-label="Search contacts"
							onChange={(event) => setSearchTerm(event.target.value)}
							placeholder="Search by name or email"
							prepend={<Search className="h-4 w-4 text-muted-foreground" />}
							value={searchTerm}
						/>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm">Rows per page</span>
						<Select
							onValueChange={handlePageSizeChange}
							value={String(pageSize)}
						>
							<SelectTrigger className="w-[90px]">
								<SelectValue placeholder={pageSize} />
							</SelectTrigger>
							<SelectContent align="end">
								{PAGE_SIZE_OPTIONS.map((option) => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				{listQuery.error ? (
					<Alert variant="destructive">
						<AlertTitle>Unable to load contacts</AlertTitle>
						<AlertDescription>
							{(listQuery.error as unknown as Error).message ??
								"An unexpected error occurred."}
						</AlertDescription>
					</Alert>
				) : null}
				<ContactsTable
					data={listQuery.data?.items ?? []}
					isLoading={listQuery.isLoading}
					onRowClick={handleRowClick}
					onSortingChange={handleSortingChange}
					sorting={sorting}
				/>
				<div className="flex flex-col items-center justify-between gap-3 px-5 py-3 sm:flex-row">
					<div className="text-muted-foreground text-sm">
						{totalCount === 0
							? "No contacts to display"
							: `Showing ${pageStart}-${pageEnd} of ${totalCount} contacts`}
					</div>
					<div className="flex items-center gap-2">
						<Button
							disabled={page <= 1 || listQuery.isFetching}
							onClick={() => handlePageChange(page - 1)}
							size="sm"
							variant="outline"
						>
							Previous
						</Button>
						<span className="font-medium text-sm">
							{page} / {totalPages}
						</span>
						<Button
							disabled={page >= totalPages || listQuery.isFetching}
							onClick={() => handlePageChange(page + 1)}
							size="sm"
							variant="outline"
						>
							Next
						</Button>
					</div>
				</div>
			</div>
			<Sheet onOpenChange={handleOpenChange} open={sheetOpen}>
				<SheetContent className="w-full border-primary/10 border-l bg-background sm:max-w-xl">
					<SheetHeader>
						<SheetTitle>Contact details</SheetTitle>
						<SheetDescription>
							View the contact profile and all associated visitors.
						</SheetDescription>
					</SheetHeader>
					<ContactDetails
						data={contactDetailQuery.data ?? null}
						isError={contactDetailQuery.isError}
						isLoading={contactDetailQuery.isFetching}
					/>
				</SheetContent>
			</Sheet>
		</Page>
	);
}

type ContactsTableProps = {
	data: ContactRow[];
	isLoading: boolean;
	sorting: SortingState;
	onSortingChange: OnChangeFn<SortingState>;
	onRowClick: (contactId: string) => void;
};

function ContactsTable({
	data,
	isLoading,
	sorting,
	onSortingChange,
	onRowClick,
}: ContactsTableProps) {
	const columns = useMemo<ColumnDef<ContactRow>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => <SortableHeader column={column} title="Name" />,
				cell: ({ row }) => {
					const { name, email } = row.original;
					return (
						<div className="flex flex-col">
							<span className="font-medium text-sm">
								{name ?? email ?? "Unknown contact"}
							</span>
							{name && email ? (
								<span className="text-muted-foreground text-xs">{email}</span>
							) : null}
						</div>
					);
				},
			},
			{
				accessorKey: "email",
				header: ({ column }) => (
					<SortableHeader column={column} title="Email" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{row.original.email ?? "—"}
					</span>
				),
			},
			{
				accessorKey: "visitorCount",
				header: ({ column }) => (
					<SortableHeader column={column} title="Visitors" />
				),
				cell: ({ row }) => (
					<Badge className="w-fit" variant="secondary">
						{row.original.visitorCount}
					</Badge>
				),
			},
			{
				accessorKey: "updatedAt",
				header: ({ column }) => (
					<SortableHeader column={column} title="Updated" />
				),
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{formatDistanceToNow(new Date(row.original.updatedAt), {
							addSuffix: true,
						})}
					</span>
				),
			},
		],
		[]
	);

	const table = useReactTable({
		data,
		columns,
		state: { sorting },
		onSortingChange,
		manualSorting: true,
		getCoreRowModel: getCoreRowModel(),
	});

	const showSkeleton = isLoading && data.length === 0;

	return (
		<div className="overflow-hidden">
			<Table>
				<TableHeader className="bg-background">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow className="hover:bg-muted/40" key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead className="px-5 py-3" key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{showSkeleton ? (
						Array.from({ length: 5 }).map((_, index) => (
							<TableRow key={`skeleton-${index}`}>
								<TableCell className="px-5 py-4" colSpan={4}>
									<Skeleton className="h-6 w-full" />
								</TableCell>
							</TableRow>
						))
					) : table.getRowModel().rows.length > 0 ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								aria-label={`View contact ${row.original.name ?? row.original.email ?? row.original.id}`}
								className="cursor-pointer"
								key={row.id}
								onClick={() => onRowClick(row.original.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onRowClick(row.original.id);
									}
								}}
								tabIndex={0}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell className="px-5 py-3" key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								className="px-4 py-6 text-center text-muted-foreground text-sm"
								colSpan={4}
							>
								No contacts found.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

type SortableHeaderProps<TData> = {
	column: Column<TData, unknown>;
	title: string;
};

function SortableHeader<TData>({ column, title }: SortableHeaderProps<TData>) {
	const sorted = column.getIsSorted();

	return (
		<button
			className="inline-flex items-center gap-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide"
			onClick={() => column.toggleSorting(sorted === "asc")}
			type="button"
		>
			<span>{title}</span>
			{sorted === "asc" ? (
				<ArrowUp className="h-3.5 w-3.5" />
			) : sorted === "desc" ? (
				<ArrowDown className="h-3.5 w-3.5" />
			) : (
				<ArrowUpDown className="h-3.5 w-3.5" />
			)}
		</button>
	);
}

type ContactDetailsProps = {
	data: ContactDetail | null;
	isLoading: boolean;
	isError: boolean;
};

function ContactDetails({ data, isLoading, isError }: ContactDetailsProps) {
	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Spinner className="h-6 w-6" />
			</div>
		);
	}

	if (isError) {
		return (
			<Alert className="m-4" variant="destructive">
				<AlertTitle>Unable to load contact</AlertTitle>
				<AlertDescription>
					An unexpected error occurred while retrieving this contact. Please try
					again.
				</AlertDescription>
			</Alert>
		);
	}

	if (!data) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
				Select a contact to view its details.
			</div>
		);
	}

	const contact = data.contact;
	const visitors = data.visitors;
	const metadataEntries = contact.metadata
		? Object.entries(contact.metadata)
		: [];

	return (
		<div className="flex h-full flex-col gap-5 overflow-y-auto pr-1 pb-6">
			<div className="flex items-center gap-3 p-4">
				<Avatar
					fallbackName={contact.name ?? contact.email ?? "Contact"}
					lastOnlineAt={null}
					url={contact.image}
					withBoringAvatar
				/>
				<div className="flex flex-col">
					<span className="font-semibold text-base">
						{contact.name ?? contact.email ?? "Contact"}
					</span>
					{contact.email ? (
						<span className="text-muted-foreground text-sm">
							{contact.email}
						</span>
					) : null}
				</div>
			</div>
			<section className="space-y-3 p-4">
				<h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
					Contact details
				</h3>
				<dl className="grid grid-cols-1 gap-3 text-sm">
					{contact.externalId ? (
						<DetailItem label="External ID" value={contact.externalId} />
					) : null}
					<DetailItem
						label="Created"
						value={formatDistanceToNow(new Date(contact.createdAt), {
							addSuffix: true,
						})}
					/>
					<DetailItem
						label="Updated"
						value={formatDistanceToNow(new Date(contact.updatedAt), {
							addSuffix: true,
						})}
					/>
					{contact.contactOrganizationId ? (
						<DetailItem
							label="Organization"
							value={contact.contactOrganizationId}
						/>
					) : null}
				</dl>
			</section>
			<section className="space-y-3 p-4">
				<h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
					Metadata
				</h3>
				{metadataEntries.length > 0 ? (
					<dl className="grid grid-cols-1 gap-3 text-sm">
						{metadataEntries.map(([key, value]) => (
							<DetailItem
								key={key}
								label={key}
								value={
									typeof value === "object"
										? JSON.stringify(value)
										: String(value)
								}
							/>
						))}
					</dl>
				) : (
					<p className="text-muted-foreground text-sm">
						No metadata recorded for this contact.
					</p>
				)}
			</section>
			<section className="space-y-3 p-4">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
						Associated visitors
					</h3>
					<Badge variant="outline">{visitors.length}</Badge>
				</div>
				{visitors.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						This contact is not linked to any visitors yet.
					</p>
				) : (
					<div className="space-y-3">
						{visitors.map((visitor) => (
							<div
								className="rounded-md border border-primary/10 bg-background/80 p-3"
								key={visitor.id}
							>
								<div className="flex flex-col gap-1">
									<div className="flex items-center justify-between gap-2">
										<span className="font-medium text-sm">
											Visitor {visitor.id}
										</span>
										<Badge
											variant={visitor.isBlocked ? "destructive" : "secondary"}
										>
											{visitor.isBlocked ? "Blocked" : "Active"}
										</Badge>
									</div>
									<span className="text-muted-foreground text-xs">
										Last seen:{" "}
										{visitor.lastSeenAt
											? formatDistanceToNow(new Date(visitor.lastSeenAt), {
													addSuffix: true,
												})
											: "Unknown"}
									</span>
									{visitor.isBlocked && visitor.blockedAt ? (
										<span className="text-destructive text-xs">
											Blocked{" "}
											{formatDistanceToNow(new Date(visitor.blockedAt), {
												addSuffix: true,
											})}
										</span>
									) : null}
								</div>
								<div className="mt-2 grid grid-cols-1 gap-1 text-muted-foreground text-xs">
									{visitor.country || visitor.city ? (
										<span>
											{visitor.city ? `${visitor.city}, ` : ""}
											{visitor.country ?? "Unknown country"}
										</span>
									) : null}
									{visitor.device ? (
										<span>Device: {visitor.device}</span>
									) : null}
									{visitor.browser ? (
										<span>Browser: {visitor.browser}</span>
									) : null}
									{visitor.language ? (
										<span>Language: {visitor.language}</span>
									) : null}
									<span>
										First seen:{" "}
										{formatDistanceToNow(new Date(visitor.createdAt), {
											addSuffix: true,
										})}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

type DetailItemProps = {
	label: string;
	value: string;
};

function DetailItem({ label, value }: DetailItemProps) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</dt>
			<dd className="break-words font-medium text-foreground text-sm">
				{value}
			</dd>
		</div>
	);
}

export default ContactsPageContent;
