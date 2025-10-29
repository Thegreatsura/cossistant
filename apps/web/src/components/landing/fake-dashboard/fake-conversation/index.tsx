import type { ConversationHeader as ConversationHeaderType } from "@cossistant/types";
import { Page } from "@/components/ui/layout";
import type { ConversationHeader } from "@/contexts/inboxes";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import type { FakeTypingVisitor, FakeVisitor } from "../data";
import { FakeInboxNavigationSidebar } from "../fake-sidebar/inbox";
import { FakeVisitorSidebar } from "../fake-sidebar/visitor";
import { FakeConversationHeader } from "./fake-conversation-header";
import { FakeConversationTimelineList } from "./fake-conversation-timeline-list";
import { FakeMultimodalInput } from "./fake-multimodal-input";

type Props = {
	typingVisitors: FakeTypingVisitor[];
	conversation: ConversationHeaderType;
	timeline: ConversationTimelineItem[];
	visitor: FakeVisitor;
};

export function FakeConversation({
	typingVisitors,
	conversation,
	timeline,
	visitor,
}: Props) {
	// Cast FakeVisitor to ConversationHeader["visitor"] for the timeline
	const timelineVisitor = visitor as unknown as ConversationHeader["visitor"];

	return (
		<>
			<FakeInboxNavigationSidebar
				activeView="inbox"
				open
				statusCounts={{ open: 10, resolved: 0, spam: 0, archived: 0 }}
			/>
			<Page className="py-0 pr-0.5 pl-0">
				<FakeConversationHeader />
				<FakeConversationTimelineList
					items={timeline}
					typingVisitors={typingVisitors}
					visitor={timelineVisitor}
				/>
				<FakeMultimodalInput />
			</Page>
			<FakeVisitorSidebar open={true} visitor={visitor} />
		</>
	);
}
