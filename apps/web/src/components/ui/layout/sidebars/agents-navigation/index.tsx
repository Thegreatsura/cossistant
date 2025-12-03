"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useWebsite } from "@/contexts/website";
import { NavigationDropdown } from "../../../../navigation-dropdown";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";
import { SidebarItem } from "../sidebar-item";

export function AgentsNavigationSidebar() {
	const website = useWebsite();
	const pathname = usePathname();

	const basePath = `/${website.slug}/agents`;

	return (
		<ResizableSidebar position="left" sidebarTitle="Agents">
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
				<SidebarItem
					active={false}
					href={`/${website.slug}/inbox`}
					iconName="arrow-left"
				>
					Agents
				</SidebarItem>

				<div className="mt-5 flex flex-col gap-2">
					<SidebarItem
						active={
							pathname === basePath || pathname.startsWith(`${basePath}/`)
						}
						href={basePath}
						iconName="agent"
					>
						AI Agent
					</SidebarItem>
				</div>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
