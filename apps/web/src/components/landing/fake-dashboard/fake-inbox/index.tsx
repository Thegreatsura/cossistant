"use client";

import type {
	ConversationHeader,
	InboxAnalyticsResponse,
} from "@cossistant/types";
import { useMemo, useRef, useState } from "react";
import {
	InboxAnalyticsDisplay,
	type InboxAnalyticsRangeDays,
} from "@/components/inbox-analytics";
import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { FakeInboxNavigationSidebar } from "../fake-sidebar/inbox";
import { FakeConversationList } from "./fake-conversation-list";
import { FakeMouseCursor } from "./fake-mouse-cursor";

type TypingVisitor = {
	conversationId: string;
	visitorId: string;
};

type Props = {
	conversations: ConversationHeader[];
	typingVisitors?: TypingVisitor[];
	showMouseCursor?: boolean;
	onMouseClick?: () => void;
};

export function FakeInbox({
	conversations,
	typingVisitors = [],
	showMouseCursor = false,
	onMouseClick,
}: Props) {
	const marcConversationRef = useRef<HTMLDivElement>(null);
	const [rangeDays, setRangeDays] = useState<InboxAnalyticsRangeDays>(7);

	const analyticsData = useMemo<InboxAnalyticsResponse>(
		() => ({
			range: {
				rangeDays,
				currentStart: new Date().toISOString(),
				currentEnd: new Date().toISOString(),
				previousStart: new Date().toISOString(),
				previousEnd: new Date().toISOString(),
			},
			current: {
				medianResponseTimeSeconds: 320,
				medianResolutionTimeSeconds: 5400,
				aiHandledRate: 62,
				satisfactionIndex: 86,
				uniqueVisitors: 1280,
			},
			previous: {
				medianResponseTimeSeconds: 410,
				medianResolutionTimeSeconds: 6100,
				aiHandledRate: 55,
				satisfactionIndex: 82,
				uniqueVisitors: 1130,
			},
		}),
		[rangeDays]
	);

	return (
		<>
			<FakeInboxNavigationSidebar
				activeView="inbox"
				open
				statusCounts={{ open: 10, resolved: 0, spam: 0, archived: 0 }}
			/>
			<Page className="relative px-0">
				<PageHeader className="px-4">
					<div className="flex items-center gap-2">
						<PageHeaderTitle className="capitalize">Inbox</PageHeaderTitle>
					</div>
				</PageHeader>

				<FakeConversationList
					analyticsSlot={
						<InboxAnalyticsDisplay
							data={analyticsData}
							onRangeChange={setRangeDays}
							rangeDays={rangeDays}
						/>
					}
					conversations={conversations}
					marcConversationRef={marcConversationRef}
					typingVisitors={typingVisitors}
				/>
				{showMouseCursor && onMouseClick && (
					<FakeMouseCursor
						isVisible={showMouseCursor}
						onClick={onMouseClick}
						targetElementRef={marcConversationRef}
					/>
				)}
			</Page>
		</>
	);
}
