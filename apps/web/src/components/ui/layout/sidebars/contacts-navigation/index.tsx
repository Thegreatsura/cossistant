"use client";

import { usePathname } from "next/navigation";
import { Filter, ListFilter, Search, SortAsc, SortDesc } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SidebarContainer } from "@/components/ui/layout/sidebars/container";
import { ResizableSidebar } from "@/components/ui/layout/sidebars/resizable-sidebar";
import { SidebarItem } from "@/components/ui/layout/sidebars/sidebar-item";
import type { ContactListVisitorStatus } from "@cossistant/types";
import {
        CONTACTS_PAGE_SIZE_OPTIONS,
        type ContactSortField,
        useContactsTableControls,
} from "@/contexts/contacts-table-controls";
import { useWebsite } from "@/contexts/website";
import { UserDropdown } from "../../../../user-dropdown";

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
const pathname = usePathname();
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
const isArchivedActive = pathname.startsWith(`${basePath}/archived`);

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
<ResizableSidebar position="left">
<SidebarContainer
footer={
<>
<SidebarItem href="/docs">Docs</SidebarItem>
<SidebarItem href={`/${website.slug}/settings`}>
Settings
</SidebarItem>
<Separator className="opacity-30" />
<UserDropdown websiteSlug={website.slug} />
</>
}
>
<div className="space-y-5 rounded-xl border border-primary/10 bg-background/80 p-3 shadow-sm">
<section className="space-y-2">
<div className="flex items-center justify-between">
<span className="text-muted-foreground text-xs uppercase tracking-wide">
Search
</span>
<Search className="h-3.5 w-3.5 text-muted-foreground" />
</div>
<Input
onChange={(event) => setSearchTerm(event.target.value)}
placeholder="Search by name or email"
value={searchTerm}
prepend={<Search className="h-4 w-4 text-muted-foreground" />}
/>
</section>

<section className="space-y-2">
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
</section>

<section className="space-y-3">
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
{VISITOR_FILTER_OPTIONS.map((option) => (
<button
className="flex w-full flex-col gap-0.5 rounded-md border border-primary/10 bg-background/60 px-3 py-2 text-left transition hover:border-primary/30 hover:bg-background"
key={option.value}
onClick={() => setVisitorStatus(option.value)}
type="button"
>
<div className="flex items-center justify-between text-xs">
<span className="font-medium">
{option.title}
</span>
{visitorStatus === option.value ? (
<ListFilter className="h-3.5 w-3.5 text-primary" />
) : null}
</div>
<span className="text-muted-foreground text-[11px]">
{option.description}
</span>
</button>
))}
</div>
</section>

<section className="space-y-3">
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
value={sortOrder}
type="single"
variant="outline"
>
<ToggleGroupItem
className="flex-1"
value="asc"
>
<div className="flex items-center justify-center gap-1 text-xs">
<SortAsc className="h-3.5 w-3.5" />
<span>Asc</span>
</div>
</ToggleGroupItem>
<ToggleGroupItem
className="flex-1"
value="desc"
>
<div className="flex items-center justify-center gap-1 text-xs">
<SortDesc className="h-3.5 w-3.5" />
<span>Desc</span>
</div>
</ToggleGroupItem>
</ToggleGroup>
</section>
</div>

<SidebarItem active={isArchivedActive} href={`${basePath}/archived`}>
Archived
</SidebarItem>
</SidebarContainer>
</ResizableSidebar>
);
}
