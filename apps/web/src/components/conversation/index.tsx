"use client";

import { useMultimodalInput } from "@cossistant/react/hooks/use-multimodal-input";
import { useEffect, useMemo, useRef } from "react";
import { useInboxes } from "@/contexts/inboxes";
import { useWebsiteMembers } from "@/contexts/website";
import { useConversationActions } from "@/data/use-conversation-actions";
import { useConversationEvents } from "@/data/use-conversation-events";
import { useConversationMessages } from "@/data/use-conversation-messages";
import { useVisitor } from "@/data/use-visitor";
import { useSendConversationMessage } from "@/hooks/use-send-conversation-message";
import { Page } from "../ui/layout";
import { VisitorSidebar } from "../ui/layout/sidebars/visitor/visitor-sidebar";
import { ConversationHeader } from "./header";
import { MessagesList } from "./messages/list";
import { MultimodalInput } from "./multimodal-input";

type ConversationProps = {
	conversationId: string;
	visitorId: string;
	websiteSlug: string;
	currentUserId: string;
};

const MESSAGES_PAGE_LIMIT = 50;

export function Conversation({
	conversationId,
	visitorId,
	currentUserId,
	websiteSlug,
}: ConversationProps) {
	const { submit: submitConversationMessage } = useSendConversationMessage({
		conversationId,
		websiteSlug,
		currentUserId,
		pageLimit: MESSAGES_PAGE_LIMIT,
	});

	const {
		message,
		files,
		isSubmitting,
		error,
		setMessage,
		addFiles,
		removeFile,
		clearFiles,
		submit,
		reset,
		isValid,
		canSubmit,
	} = useMultimodalInput({
		onSubmit: submitConversationMessage,
		onError: (submitError) => {
			console.error("Failed to send message", submitError);
		},
	});

	const members = useWebsiteMembers();
	const { selectedConversation } = useInboxes();
	const { markRead } = useConversationActions({
		conversationId,
		visitorId,
	});

	const lastMarkedMessageIdRef = useRef<string | null>(null);

	const {
		messages,
		fetchNextPage: fetchNextPageMessages,
		hasNextPage: hasNextPageMessages,
	} = useConversationMessages({
		conversationId,
		websiteSlug,
		options: { limit: MESSAGES_PAGE_LIMIT },
	});

	const {
		events,
		fetchNextPage: fetchNextPageEvents,
		hasNextPage: hasNextPageEvents,
	} = useConversationEvents({ conversationId, websiteSlug });

	const { visitor, isLoading } = useVisitor({ visitorId, websiteSlug });

	const lastMessage = useMemo(() => messages.at(-1) ?? null, [messages]);

	useEffect(() => {
		if (!lastMessage) {
			return;
		}

		if (!selectedConversation || selectedConversation.id !== conversationId) {
			lastMarkedMessageIdRef.current = null;
			return;
		}

		if (lastMessage.userId === currentUserId) {
			lastMarkedMessageIdRef.current = lastMessage.id;
			return;
		}

		const lastMessageCreatedAt = new Date(lastMessage.createdAt);
		const lastSeenAt = selectedConversation.lastSeenAt
			? new Date(selectedConversation.lastSeenAt)
			: null;

		if (lastSeenAt && lastSeenAt >= lastMessageCreatedAt) {
			lastMarkedMessageIdRef.current = lastMessage.id;
			return;
		}

		if (lastMarkedMessageIdRef.current === lastMessage.id) {
			return;
		}

		markRead()
			.then(() => {
				lastMarkedMessageIdRef.current = lastMessage.id;
			})
			.catch(() => {
				// no-op: we'll retry on next render if needed
			});
	}, [
		conversationId,
		currentUserId,
		lastMessage,
		markRead,
		selectedConversation,
	]);

	const onFetchMoreIfNeeded = async () => {
		const promises: Promise<unknown>[] = [];

		if (hasNextPageMessages) {
			promises.push(fetchNextPageMessages());
		}

		if (hasNextPageEvents) {
			promises.push(fetchNextPageEvents());
		}

		await Promise.all(promises);
	};

	if (!visitor) {
		return null;
	}

	const seenData = selectedConversation?.seenData ?? [];

	console.log("seenData", seenData);

	return (
		<>
			<Page className="relative px-[1px] py-0">
				<div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-14 bg-gradient-to-b from-co-background/50 to-transparent dark:from-co-background-100/80" />
				<ConversationHeader />
				<MessagesList
					availableAIAgents={[]}
					currentUserId={currentUserId}
					events={events}
					messages={messages}
					onFetchMoreIfNeeded={onFetchMoreIfNeeded}
					seenData={selectedConversation?.seenData ?? []}
					teamMembers={members}
					visitor={visitor}
				/>
				<MultimodalInput
					allowedFileTypes={["image/*", "application/pdf", "text/*"]}
					error={error}
					files={files}
					isSubmitting={isSubmitting}
					maxFileSize={10 * 1024 * 1024}
					maxFiles={2}
					onChange={setMessage}
					onFileSelect={addFiles}
					onRemoveFile={removeFile}
					onSubmit={submit}
					placeholder="Type your message..."
					value={message}
				/>
				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-30 bg-gradient-to-t from-co-background to-transparent dark:from-co-background-100/90" />
				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-co-background/50 via-co-background to-transparent dark:from-co-background-100/90 dark:via-co-background-100" />
			</Page>
			<VisitorSidebar isLoading={isLoading} visitor={visitor} />
		</>
	);
}
