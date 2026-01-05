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
	const isWebSourcesActive = pathname.startsWith(`${trainingPath}/web`);
	const isFaqActive = pathname.startsWith(`${trainingPath}/faq`);
	const isFilesActive = pathname.startsWith(`${trainingPath}/files`);
	const isToolsActive = pathname.startsWith(`${basePath}/tools`);
	const isIntegrationsActive = pathname.startsWith(`${basePath}/integrations`);

	// Determine if sections should be open by default
	const isKnowledgeActive = isWebSourcesActive || isFaqActive || isFilesActive;
	const isCapabilitiesActive = isToolsActive || isIntegrationsActive;

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

				<div className="mt-3 flex flex-col gap-1">
					<SidebarItem
						active={isGeneralActive}
						href={basePath}
						iconName="settings-2"
					>
						General
					</SidebarItem>
				</div>

				{/* Knowledge Section */}
				<SidebarItem
					defaultOpen={isKnowledgeActive}
					iconName="book-open"
					items={[
						{
							label: "Web Sources",
							href: `${trainingPath}/web`,
							active: isWebSourcesActive,
						},
						{
							label: "FAQ",
							href: `${trainingPath}/faq`,
							active: isFaqActive,
						},
						{
							label: "Files",
							href: `${trainingPath}/files`,
							active: isFilesActive,
							rightItem: (
								<Badge className="ml-auto" variant="secondary">
									Soon
								</Badge>
							),
						},
					]}
				>
					Knowledge
				</SidebarItem>

				{/* Capabilities Section */}
				<SidebarItem
					defaultOpen={isCapabilitiesActive}
					iconName="cli"
					items={[
						{
							label: "Tools",
							href: `${basePath}/tools`,
							active: isToolsActive,
							rightItem: (
								<Badge className="ml-auto" variant="secondary">
									Soon
								</Badge>
							),
						},
						{
							label: "Integrations",
							href: `${basePath}/integrations`,
							active: isIntegrationsActive,
							rightItem: (
								<Badge className="ml-auto" variant="secondary">
									Soon
								</Badge>
							),
						},
					]}
				>
					Capabilities
				</SidebarItem>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
