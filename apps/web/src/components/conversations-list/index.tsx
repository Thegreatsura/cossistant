"use client";

import type { ConversationStatus } from "@cossistant/types";
import { useEffect } from "react";
import type { ConversationHeader } from "@/contexts/inboxes";
import { useConversationFocusStore } from "@/contexts/inboxes/conversation-focus-store";
import { useSidebar } from "@/hooks/use-sidebars";
import { Button } from "../ui/button";
import Icon from "../ui/icons";
import { Page, PageHeader, PageHeaderTitle } from "../ui/layout";
import { TooltipOnHover } from "../ui/tooltip";
import { VirtualizedConversations } from "./virtualized-conversations";

type Props = {
	basePath: string;
	selectedConversationStatus: ConversationStatus | "archived" | null;
	conversations: ConversationHeader[];
	websiteSlug: string;
};

export function ConversationsList({
	basePath,
	selectedConversationStatus,
	conversations,
	websiteSlug,
}: Props) {
	const clearFocus = useConversationFocusStore((state) => state.clearFocus);
	const { open: isLeftSidebarOpen, toggle: toggleLeftSidebar } = useSidebar({
		position: "left",
	});

	useEffect(() => {
		clearFocus();
	}, [selectedConversationStatus, clearFocus]);

	return (
		<Page className="px-2">
			<PageHeader className="px-4">
				<div className="flex items-center gap-2">
					{!isLeftSidebarOpen && (
						<TooltipOnHover
							align="end"
							content="Click to open sidebar"
							shortcuts={["["]}
						>
							<Button
								className="ml-0.5"
								onClick={toggleLeftSidebar}
								size="icon-small"
								variant="ghost"
							>
								<Icon filledOnHover name="sidebar-collapse" />
							</Button>
						</TooltipOnHover>
					)}
					<PageHeaderTitle className="capitalize">
						{selectedConversationStatus || "Inbox"}
					</PageHeaderTitle>
				</div>
			</PageHeader>
			<div className="h-full w-full py-2">
				{conversations.length === 0 ? (
					<div className="mx-1 mt-4 flex h-1/3 flex-col items-center justify-center gap-1">
						<p className="text-base text-primary/40">
							No {selectedConversationStatus} conversations yet
						</p>
					</div>
				) : (
					<VirtualizedConversations
						basePath={basePath}
						conversations={conversations}
						websiteSlug={websiteSlug}
					/>
				)}
			</div>
		</Page>
	);
}
