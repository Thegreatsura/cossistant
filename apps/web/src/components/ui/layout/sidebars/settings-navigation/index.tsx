"use client";

import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useWebsite } from "@/contexts/website";
import { UserDropdown } from "../../../../user-dropdown";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";
import { SidebarItem } from "../sidebar-item";

export function SettingsNavigationSidebar() {
	const website = useWebsite();
	const pathname = usePathname();
	const router = useRouter();

	const basePath = `/${website.slug}/settings`;

	return (
		<ResizableSidebar position="left">
			<SidebarContainer
				footer={
					<>
						<SidebarItem href="/docs">Docs</SidebarItem>
						<Separator className="opacity-30" />
						<UserDropdown websiteSlug={website.slug} />
					</>
				}
			>
				<SidebarItem
					active={false}
					href={`/${website.slug}/inbox`}
					iconName="arrow-left"
				>
					Settings
				</SidebarItem>

				<div className="mt-5 flex flex-col gap-2">
					<SidebarItem
						active={
							pathname.includes(basePath) && !pathname.includes(`${basePath}/`)
						}
						href={basePath}
						iconName="settings-2"
					>
						General
					</SidebarItem>
					<SidebarItem
						active={pathname.includes(`${basePath}/usage`)}
						href={`${basePath}/plan`}
						iconName="wallet"
					>
						Plan & Usage
					</SidebarItem>
					<SidebarItem
						active={pathname.includes(`${basePath}/developers`)}
						href={`${basePath}/developers`}
						iconName="cli"
					>
						Developers
					</SidebarItem>
				</div>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
