"use client";

import type { ConversationStatus } from "@cossistant/types";
import Link from "next/link";
import type { ConversationHeader } from "@/contexts/inboxes";
import { Button } from "../ui/button";
import Icon from "../ui/icons";
import { Page, PageContent, PageHeader, PageHeaderTitle } from "../ui/layout";
import { TextEffect } from "../ui/text-effect";
import { TooltipOnHover } from "../ui/tooltip";
import { InboxModeTabs } from "./inbox-mode-tabs";
import type { SortMode, VirtualListItem } from "./types";
import { VirtualizedConversations } from "./virtualized-conversations";

type Props = {
	basePath: string;
	selectedConversationStatus: ConversationStatus | "archived" | null;
	conversations: ConversationHeader[];
	websiteSlug: string;
	isLeftSidebarOpen: boolean;
	onToggleLeftSidebar: () => void;
	sortMode: SortMode;
	onSortModeChange: (mode: SortMode) => void;
	smartItems?: VirtualListItem[] | null;
};

export function ConversationsList({
	basePath,
	selectedConversationStatus,
	conversations,
	websiteSlug,
	isLeftSidebarOpen,
	onToggleLeftSidebar,
	sortMode,
	onSortModeChange,
	smartItems,
}: Props) {
	const showWaitingForReplyPill = selectedConversationStatus === null;
	const isMainInbox = selectedConversationStatus === null;

	return (
		<Page className="px-0">
			<PageHeader className="flex items-center justify-between bg-transparent px-4 pl-5 dark:bg-transparent">
				<div className="flex items-center gap-2">
					{!isLeftSidebarOpen && (
						<TooltipOnHover
							align="end"
							content="Click to open sidebar"
							shortcuts={["["]}
						>
							<Button
								className="ml-0.5"
								onClick={onToggleLeftSidebar}
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
				{isMainInbox && (
					<InboxModeTabs mode={sortMode} onModeChange={onSortModeChange} />
				)}
			</PageHeader>
			{conversations.length === 0 ? (
				<PageContent>
					<div className="mx-1 mt-4 flex h-1/3 flex-col items-center justify-center gap-10">
						<TextEffect as="h1" className="text-primary/60 text-xl">
							No {selectedConversationStatus || ""} conversations yet
						</TextEffect>
						<div className="flex items-center justify-center gap-2">
							<Button asChild variant="ghost">
								<Link href="/docs/quickstart">Read our setup guide</Link>
							</Button>
							<Button asChild variant="ghost">
								<Link href="/docs/concepts">What are visitors?</Link>
							</Button>
							<Button asChild variant="ghost">
								<Link href="/docs/concepts/conversations">
									Learn about conversations
								</Link>
							</Button>
						</div>
					</div>
				</PageContent>
			) : (
				<VirtualizedConversations
					basePath={basePath}
					conversations={conversations}
					showWaitingForReplyPill={showWaitingForReplyPill}
					smartItems={smartItems}
					sortMode={sortMode}
					websiteSlug={websiteSlug}
				/>
			)}
		</Page>
	);
}
