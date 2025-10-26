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
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
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
import { useTRPC } from "@/lib/trpc/client";
import {
        type ContactSortField,
        useContactsTableControls,
} from "@/contexts/contacts-table-controls";
import { useVisitorPresence } from "@/contexts/visitor-presence";

type ContactsPageContentProps = {
	websiteSlug: string;
};

type ContactRow = RouterOutputs["contact"]["list"]["items"][number];

type ContactDetail = RouterOutputs["contact"]["get"];

export function ContactsPageContent({ websiteSlug }: ContactsPageContentProps) {
	const trpc = useTRPC();
	const queryNormalizer = useQueryNormalizer();
	const {
		page,
		setPage,
		pageSize,
		debouncedSearchTerm,
		sorting,
		setSorting,
		visitorStatus,
	} = useContactsTableControls();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [selectedContactId, setSelectedContactId] = useState<string | null>(
		null
	);

	const activeSort = sorting[0];
	const sortBy = activeSort?.id as ContactSortField | undefined;
	const sortOrder = activeSort ? (activeSort.desc ? "desc" : "asc") : undefined;

	const listQuery = useQuery({
		...trpc.contact.list.queryOptions({
			websiteSlug,
			page,
			limit: pageSize,
			search: debouncedSearchTerm || undefined,
			sortBy,
			sortOrder,
			visitorStatus,
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
		setSorting(updater);
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

	const pageStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
	const pageEnd = totalCount === 0 ? 0 : Math.min(totalCount, page * pageSize);

	return (
		<Page className="relative flex flex-col gap-6">
			<PageHeader className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<PageHeaderTitle>Contacts</PageHeaderTitle>
			</PageHeader>
<div className="mt-2 flex flex-col gap-5">
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

const LOADING_ROW_COUNT = 5;

function ContactsTable({
	data,
	isLoading,
	sorting,
	onSortingChange,
	onRowClick,
}: ContactsTableProps) {
	const { visitors: presenceVisitors } = useVisitorPresence();

        const presenceByContactId = useMemo(() => {
                const map = new Map<
                        string,
                        {
                                status: "online" | "away";
                                lastSeenAt: string;
                                image: string | null;
                        }
                >();
                const timestamps = new Map<string, number>();

                for (const visitor of presenceVisitors) {
                        const contactId = visitor.contactId;

                        if (!contactId) {
                                continue;
                        }

                        if (!visitor.lastSeenAt) {
                                continue;
                        }

                        const parsedLastSeen = Date.parse(visitor.lastSeenAt);

                        if (Number.isNaN(parsedLastSeen)) {
                                continue;
                        }

                        const existing = map.get(contactId);
                        const existingTimestamp = timestamps.get(contactId);
                        const candidate = {
                                status: visitor.status,
                                lastSeenAt: visitor.lastSeenAt,
                                image: visitor.image ?? null,
                        };

                        if (!existing) {
                                map.set(contactId, candidate);
                                timestamps.set(contactId, parsedLastSeen);
                                continue;
                        }

                        if (candidate.status === "online" && existing.status !== "online") {
                                map.set(contactId, candidate);
                                timestamps.set(contactId, parsedLastSeen);
                                continue;
                        }

                        if (existing.status === "online" && candidate.status !== "online") {
                                continue;
                        }

                        if (existingTimestamp === undefined || parsedLastSeen > existingTimestamp) {
                                map.set(contactId, candidate);
                                timestamps.set(contactId, parsedLastSeen);
                        }
                }

                return map;
        }, [presenceVisitors]);

	const columns = useMemo<ColumnDef<ContactRow>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => <SortableHeader column={column} title="Name" />,
				cell: ({ row }) => {
					const { id, name, email, image } = row.original;
					const displayName = name ?? email ?? "Unknown contact";
					const presence = presenceByContactId.get(id);
					const avatarUrl = image ?? presence?.image ?? null;

					return (
						<div className="flex items-center gap-3">
							<Avatar
								className="size-9"
								fallbackName={displayName}
								lastOnlineAt={presence?.lastSeenAt ?? null}
								status={presence?.status}
								url={avatarUrl}
								withBoringAvatar
							/>
							<div className="flex flex-col">
								<span className="font-medium text-sm">{displayName}</span>
								{name && email ? (
									<span className="text-muted-foreground text-xs">{email}</span>
								) : null}
							</div>
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
		[presenceByContactId]
	);

        const table = useReactTable({
                data,
                columns,
                state: { sorting },
                onSortingChange,
                manualSorting: true,
                getCoreRowModel: getCoreRowModel(),
        });

        const headerGroups = table.getHeaderGroups();
        const rows = table.getRowModel().rows;

        if (isLoading) {
                return (
                        <div className="overflow-hidden rounded-xl border border-primary/10 bg-background/80 shadow-sm">
                                <Table>
                                        <TableHeader>
                                                {headerGroups.map((headerGroup) => (
                                                        <TableRow key={headerGroup.id}>
                                                                {headerGroup.headers.map((header) => (
                                                                        <TableHead key={header.id}>
                                                                                {header.isPlaceholder
                                                                                        ? null
                                                                                        : flexRender(
                                                                                                  header.column.columnDef
                                                                                                          .header,
                                                                                                  header.getContext()
                                                                                          )}
                                                                        </TableHead>
                                                                ))}
                                                        </TableRow>
                                                ))}
                                        </TableHeader>
                                        <TableBody>
                                                {Array.from({ length: LOADING_ROW_COUNT }, (_, index) => (
                                                        <TableRow key={index}>
                                                                <TableCell colSpan={columns.length}>
                                                                        <Skeleton className="h-12 w-full" />
                                                                </TableCell>
                                                        </TableRow>
                                                ))}
                                        </TableBody>
                                </Table>
                        </div>
                );
        }

        if (!rows.length) {
                return (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/20 bg-background/60 px-10 py-16 text-center">
                                <div className="space-y-1">
                                        <h3 className="font-semibold text-base">No contacts match your filters</h3>
                                        <p className="text-muted-foreground text-sm">
                                                Try adjusting your search, filters, or sorting to find different contacts.
                                        </p>
                                </div>
                        </div>
                );
        }

        return (
                <div className="overflow-hidden rounded-xl border border-primary/10 bg-background/80 shadow-sm">
                        <Table>
                                <TableHeader>
                                        {headerGroups.map((headerGroup) => (
                                                <TableRow key={headerGroup.id}>
                                                        {headerGroup.headers.map((header) => {
                                                                const sorted = header.column.getIsSorted();

                                                                return (
                                                                        <TableHead
                                                                                key={header.id}
                                                                                aria-sort={
                                                                                        sorted === "desc"
                                                                                                ? "descending"
                                                                                                : sorted === "asc"
                                                                                                        ? "ascending"
                                                                                                        : "none"
                                                                                }
                                                                        >
                                                                                {header.isPlaceholder
                                                                                        ? null
                                                                                        : flexRender(
                                                                                                  header.column.columnDef
                                                                                                          .header,
                                                                                                  header.getContext()
                                                                                          )}
                                                                        </TableHead>
                                                                );
                                                        })}
                                                </TableRow>
                                        ))}
                                </TableHeader>
                                <TableBody>
                                        {rows.map((row) => (
                                                <TableRow
                                                        key={row.id}
                                                        className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/50"
                                                        onClick={() => onRowClick(row.original.id)}
                                                        onKeyDown={(event) => {
                                                                if (event.key === "Enter" || event.key === " ") {
                                                                        event.preventDefault();
                                                                        onRowClick(row.original.id);
                                                                }
                                                        }}
                                                        tabIndex={0}
                                                >
                                                        {row.getVisibleCells().map((cell) => (
                                                                <TableCell key={cell.id}>
                                                                        {flexRender(
                                                                                cell.column.columnDef.cell,
                                                                                cell.getContext()
                                                                        )}
                                                                </TableCell>
                                                        ))}
                                                </TableRow>
                                        ))}
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
                                <ArrowUp aria-hidden="true" className="h-3.5 w-3.5">
                                        <title>Sorted ascending</title>
                                </ArrowUp>
                        ) : sorted === "desc" ? (
                                <ArrowDown aria-hidden="true" className="h-3.5 w-3.5">
                                        <title>Sorted descending</title>
                                </ArrowDown>
                        ) : (
                                <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5">
                                        <title>Sortable column</title>
                                </ArrowUpDown>
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
