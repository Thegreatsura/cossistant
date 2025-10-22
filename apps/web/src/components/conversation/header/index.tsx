"use client";

import type { ConversationStatus } from "@cossistant/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { PageHeader } from "../../ui/layout";
import { ConversationBasicActions } from "../actions/basic";
import { MoreConversationActions } from "../actions/more";
import {
	ConversationHeaderNavigation,
	type ConversationHeaderNavigationProps,
} from "./navigation";

export type ConversationHeaderProps = {
	isLeftSidebarOpen: boolean;
	isRightSidebarOpen: boolean;
	onToggleLeftSidebar: () => void;
	onToggleRightSidebar: () => void;
	navigation: ConversationHeaderNavigationProps;
	conversationId: string;
	visitorId?: string | null;
	status?: ConversationStatus;
	deletedAt?: string | null;
	hasUnreadMessage: boolean;
	visitorIsBlocked?: boolean | null;
};

export function ConversationHeader({
	isLeftSidebarOpen,
	isRightSidebarOpen,
	onToggleLeftSidebar,
	onToggleRightSidebar,
	navigation,
	conversationId,
	visitorId,
	status,
	deletedAt,
	hasUnreadMessage,
	visitorIsBlocked,
}: ConversationHeaderProps) {
	return (
		<PageHeader className="z-10 border-primary/10 border-b bg-background pl-3.5 2xl:border-transparent 2xl:bg-transparent dark:bg-background-100 2xl:dark:bg-transparent">
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
				<ConversationHeaderNavigation {...navigation} />
			</div>
			<div className="flex items-center gap-3">
				<ConversationBasicActions
					className="gap-3 pr-0"
					conversationId={conversationId}
					deletedAt={deletedAt ?? null}
					status={status}
					visitorId={visitorId}
				/>
				<MoreConversationActions
					conversationId={conversationId}
					deletedAt={deletedAt ?? null}
					hasUnreadMessage={hasUnreadMessage}
					status={status}
					visitorId={visitorId}
					visitorIsBlocked={visitorIsBlocked ?? null}
				/>
				{!isRightSidebarOpen && (
					<TooltipOnHover
						align="end"
						content="Click to open sidebar"
						shortcuts={["]"]}
					>
						<Button
							className="rotate-180"
							onClick={onToggleRightSidebar}
							size="icon-small"
							variant="ghost"
						>
							<Icon filledOnHover name="sidebar-collapse" />
						</Button>
					</TooltipOnHover>
				)}
			</div>
		</PageHeader>
	);
}
