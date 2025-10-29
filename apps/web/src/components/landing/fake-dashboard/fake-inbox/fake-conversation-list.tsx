import type { ConversationHeader } from "@cossistant/types";
import { PageContent } from "@/components/ui/layout";

type FakeConversationListItemProps = {
	conversation: ConversationHeader;
};

export function FakeConversationListItem({
	conversation,
}: FakeConversationListItemProps) {
	return (
		<div>
			<h1>Conversation List Item</h1>
		</div>
	);
}

type FakeConversationListProps = {
	conversations: ConversationHeader[];
};

export function FakeConversationList({
	conversations,
}: FakeConversationListProps) {
	return (
		<PageContent className="h-full overflow-auto px-2 contain-strict">
			{conversations.map((conversation) => (
				<FakeConversationListItem
					conversation={conversation}
					key={conversation.id}
				/>
			))}
		</PageContent>
	);
}
