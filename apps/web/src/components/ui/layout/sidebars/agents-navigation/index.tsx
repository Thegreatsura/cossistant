"use client";

import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
	const trainingPath = `${basePath}/training`;

	// Check if current path matches
	const isGeneralActive =
		pathname === basePath && !pathname.includes("/training");
	const isTrainingActive = pathname.startsWith(trainingPath);
	const isWebSourcesActive = pathname.startsWith(`${trainingPath}/web`);
	const isFaqActive = pathname.startsWith(`${trainingPath}/faq`);
	const isFilesActive = pathname.startsWith(`${trainingPath}/files`);
	const isToolsActive = pathname.startsWith(`${basePath}/tools`);
	const isIntegrationsActive = pathname.startsWith(`${basePath}/integrations`);

	return (
		<ResizableSidebar position="left" sidebarTitle="AI Agent">
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
					Back to Inbox
				</SidebarItem>

				<div className="mt-5 flex flex-col gap-1">
					<SidebarItem
						active={isGeneralActive}
						href={basePath}
						iconName="settings-2"
					>
						General
					</SidebarItem>
				</div>

				{/* Training Section */}
				<div className="mt-6">
					<span className="mb-2 block px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						Training
					</span>
					<div className="flex flex-col gap-1">
						<SidebarItem
							active={isWebSourcesActive}
							href={`${trainingPath}/web`}
							iconName="dashboard"
						>
							Web Sources
						</SidebarItem>
						<SidebarItem
							active={isFaqActive}
							href={`${trainingPath}/faq`}
							iconName="help"
						>
							FAQ
						</SidebarItem>
						<SidebarItem
							active={isFilesActive}
							href={`${trainingPath}/files`}
							iconName="file"
							rightItem={
								<Badge className="ml-auto" variant="secondary">
									Soon
								</Badge>
							}
						>
							Files
						</SidebarItem>
					</div>
				</div>

				{/* Capabilities Section */}
				<div className="mt-6">
					<span className="mb-2 block px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						Capabilities
					</span>
					<div className="flex flex-col gap-1">
						<SidebarItem
							active={isToolsActive}
							href={`${basePath}/tools`}
							iconName="cli"
							rightItem={
								<Badge className="ml-auto" variant="secondary">
									Soon
								</Badge>
							}
						>
							Tools
						</SidebarItem>
						<SidebarItem
							active={isIntegrationsActive}
							href={`${basePath}/integrations`}
							iconName="card"
							rightItem={
								<Badge className="ml-auto" variant="secondary">
									Soon
								</Badge>
							}
						>
							Integrations
						</SidebarItem>
					</div>
				</div>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
