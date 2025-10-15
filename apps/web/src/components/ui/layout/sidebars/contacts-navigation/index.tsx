"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useInboxes } from "@/contexts/inboxes";
import { useWebsite } from "@/contexts/website";
import { UserDropdown } from "../../../../user-dropdown";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";
import { SidebarItem } from "../sidebar-item";

export function ContactsNavigationSidebar() {
	const website = useWebsite();
	const pathname = usePathname();

	const basePath = `/${website.slug}/contacts`;

	return (
		<ResizableSidebar position="left">
			<SidebarContainer
				footer={
					<>
						<SidebarItem href={`/${website.slug}/settings`}>
							Settings
						</SidebarItem>
						<Separator className="opacity-30" />
						<UserDropdown websiteSlug={website.slug} />
					</>
				}
			>
				<SidebarItem
					active={true}
					href={`${basePath}/archived`}
					// iconName="archive"
				>
					Archived
				</SidebarItem>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
