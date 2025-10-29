import type { ConversationHeader } from "@cossistant/types";
import { Page } from "@/components/ui/layout";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import type { FakeTypingVisitor, FakeVisitor } from "../data";
import { FakeInboxNavigationSidebar } from "../fake-sidebar/inbox";
import { FakeVisitorSidebar } from "../fake-sidebar/visitor";

type Props = {
	typingVisitors: FakeTypingVisitor[];
	conversation: ConversationHeader;
	timeline: ConversationTimelineItem[];
	visitor: FakeVisitor;
};

export function FakeConversation({
	typingVisitors,
	conversation,
	visitor,
}: Props) {
	return (
		<>
			<FakeInboxNavigationSidebar
				activeView="inbox"
				open
				statusCounts={{ open: 10, resolved: 0, spam: 0, archived: 0 }}
			/>
			<Page className="relative py-0 pr-0.5 pl-0">
				{/* <FakeConversationHeader />
				<FakeConversationTimelineList />
				<FakeMultimodalInput /> */}
				holla
			</Page>
			<FakeVisitorSidebar open={true} visitor={visitor} />
		</>
	);
}
