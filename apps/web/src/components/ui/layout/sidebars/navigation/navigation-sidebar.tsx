"use client";

import { PageHeader } from "../..";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";

export function NavigationSidebar() {
	return (
		<ResizableSidebar position="left">
			<SidebarContainer>
				<PageHeader>
					<h4 className="px-2 text-primary/60 text-xs tracking-wider">
						Conversations
					</h4>
				</PageHeader>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
