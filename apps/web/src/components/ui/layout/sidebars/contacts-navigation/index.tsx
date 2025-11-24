"use client";

import type { ContactListVisitorStatus } from "@cossistant/types";
import { Filter, ListFilter, Search, SortAsc, SortDesc } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarContainer } from "@/components/ui/layout/sidebars/container";
import { ResizableSidebar } from "@/components/ui/layout/sidebars/resizable-sidebar";
import { SidebarItem } from "@/components/ui/layout/sidebars/sidebar-item";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	CONTACTS_PAGE_SIZE_OPTIONS,
	type ContactSortField,
	useContactsTableControls,
} from "@/contexts/contacts-table-controls";
import { useWebsite } from "@/contexts/website";
import { NavigationDropdown } from "../../../../navigation-dropdown";

const VISITOR_FILTER_OPTIONS: ReadonlyArray<{
	value: ContactListVisitorStatus;
	title: string;
	description: string;
}> = [
	{
		value: "all",
		title: "All contacts",
		description: "Include every contact",
	},
	{
		value: "withVisitors",
		title: "Linked visitors",
		description: "Contacts with at least one visitor",
	},
	{
		value: "withoutVisitors",
		title: "No visitors",
		description: "Contacts without any visitor",
	},
];

const DEFAULT_VISITOR_STATUS: ContactListVisitorStatus = "all";

const SORT_FIELD_OPTIONS: Array<{ value: ContactSortField; label: string }> = [
	{ value: "updatedAt", label: "Last updated" },
	{ value: "createdAt", label: "Created" },
	{ value: "name", label: "Name" },
	{ value: "email", label: "Email" },
	{ value: "visitorCount", label: "Visitor count" },
];

export function ContactsNavigationSidebar() {
	const website = useWebsite();
	const {
		searchTerm,
		setSearchTerm,
		pageSize,
		setPageSize,
		sorting,
		setSorting,
		visitorStatus,
		setVisitorStatus,
	} = useContactsTableControls();

	const basePath = `/${website.slug}/contacts`;

	const activeSort = sorting[0] ?? { id: "updatedAt", desc: true };
	const sortField = (activeSort.id as ContactSortField) ?? "updatedAt";
	const sortOrder = activeSort.desc ? "desc" : "asc";

	const handleSortFieldChange = (value: string) => {
		if (!value) {
			return;
		}

		const nextField = value as ContactSortField;
		setSorting([{ id: nextField, desc: sortOrder === "desc" }]);
	};

	const handleSortOrderChange = (value: string) => {
		if (!value) {
			return;
		}

		setSorting([{ id: sortField, desc: value === "desc" }]);
	};

	return (
		<ResizableSidebar position="left" sidebarTitle="Contacts">
			<SidebarContainer
				footer={
					<>
						<SidebarItem href="/docs">Docs</SidebarItem>
						<SidebarItem href={`/${website.slug}/settings`}>
							Settings
						</SidebarItem>
						<Separator className="opacity-30" />
						<NavigationDropdown websiteSlug={website.slug} />
					</>
				}
			>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-xs uppercase tracking-wide">
						Results per page
					</span>
					<span className="text-muted-foreground text-xs">{pageSize}</span>
				</div>
				<Select
					onValueChange={(value) => setPageSize(Number.parseInt(value, 10))}
					value={String(pageSize)}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder={pageSize} />
					</SelectTrigger>
					<SelectContent>
						{CONTACTS_PAGE_SIZE_OPTIONS.map((option) => (
							<SelectItem key={option} value={String(option)}>
								{option} per page
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
						<Filter className="h-3.5 w-3.5" />
						<span>Filters</span>
					</div>
					<Button
						className="h-auto px-2 py-1 text-xs"
						onClick={() => setVisitorStatus(DEFAULT_VISITOR_STATUS)}
						variant="ghost"
					>
						Reset
					</Button>
				</div>
                                <div className="space-y-2">
                                        {VISITOR_FILTER_OPTIONS.map((option) => {
                                                const isSelected = visitorStatus === option.value;

                                                return (
                                                        <button
                                                                aria-pressed={isSelected}
                                                                className={`group flex w-full flex-col rounded-lg px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40 ${
                                                                        isSelected
                                                                                ? "bg-primary/5"
                                                                                : "hover:bg-muted/60"
                                                                }`}
                                                                key={option.value}
                                                                onClick={() => setVisitorStatus(option.value)}
                                                                type="button"
                                                        >
                                                                <div className="flex items-center justify-between text-sm font-medium">
                                                                        <span>{option.title}</span>
                                                                        <span
                                                                                className={`flex h-4 w-4 items-center justify-center rounded-full text-primary transition-opacity ${
                                                                                        isSelected
                                                                                                ? "opacity-100"
                                                                                                : "opacity-0 group-hover:opacity-70"
                                                                                }`}
                                                                        >
                                                                                <ListFilter className="h-3.5 w-3.5" />
                                                                        </span>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">
                                                                        {option.description}
                                                                </span>
                                                        </button>
                                                );
                                        })}
                                </div>

				<div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
					<span>Ordering</span>
					<ListFilter className="h-3.5 w-3.5" />
				</div>
				<Select onValueChange={handleSortFieldChange} value={sortField}>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{SORT_FIELD_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<ToggleGroup
					className="w-full"
					onValueChange={handleSortOrderChange}
					type="single"
					value={sortOrder}
					variant="outline"
				>
					<ToggleGroupItem className="flex-1" value="asc">
						<div className="flex items-center justify-center gap-1 text-xs">
							<SortAsc className="h-3.5 w-3.5" />
							<span>Asc</span>
						</div>
					</ToggleGroupItem>
					<ToggleGroupItem className="flex-1" value="desc">
						<div className="flex items-center justify-center gap-1 text-xs">
							<SortDesc className="h-3.5 w-3.5" />
							<span>Desc</span>
						</div>
					</ToggleGroupItem>
				</ToggleGroup>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
