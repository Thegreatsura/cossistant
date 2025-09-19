import type {
	ConversationEvent,
	Message as MessageType,
} from "@cossistant/types";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import React from "react";
import { useSupport } from "../..";
import { useDefaultMessages } from "../../hooks/use-default-messages";
import { useRealtimeSupport } from "../../hooks/use-realtime-support";
import { PENDING_CONVERSATION_ID } from "../../utils/id";
import { AvatarStack } from "../components/avatar-stack";
import { Header } from "../components/header";
import { MessageList } from "../components/message-list";
import { MultimodalInput } from "../components/multimodal-input";
import {
	addRealtimeSupportMessageToCache,
	useMessages,
} from "../hooks/use-messages";
import { useSendMessage } from "../hooks/use-send-message";
import { useSupportNavigation } from "../store";

type ConversationPageProps = {
	conversationId: string;
	message: string;
	files: File[];
	isSubmitting: boolean;
	error: Error | null;
	setMessage: (message: string) => void;
	addFiles: (files: File[]) => void;
	removeFile: (index: number) => void;
	submit: () => void;
	messages?: MessageType[];
	events: ConversationEvent[];
};

const isMessageCreatedEvent = (
	event: RealtimeEvent
): event is RealtimeEvent<"MESSAGE_CREATED"> => {
	return event.type === "MESSAGE_CREATED";
};

export const ConversationPage = ({
	conversationId,
	message,
	files,
	isSubmitting,
	error,
	setMessage,
	addFiles,
	removeFile,
	submit,
	messages = [],
	events = [],
}: ConversationPageProps) => {
	const {
		website,
		availableAIAgents,
		availableHumanAgents,
		client,
		visitor,
		queryClient,
	} = useSupport();
	const { navigate, replace, goBack, canGoBack } = useSupportNavigation();

	// Determine if we have a real conversation or pending one
	const hasRealConversation = conversationId !== PENDING_CONVERSATION_ID;
	const realConversationId = hasRealConversation ? conversationId : null;
	const defaultMessages = useDefaultMessages({
		conversationId,
	});

	const {
		data: fetchedMessages,
		// isLoading: messagesLoading,
		error: messagesError,
	} = useMessages({
		client,
		conversationId,
		defaultMessages,
	});

	const sendMessage = useSendMessage(client);

	const handleRealtimeEvent = React.useCallback(
		(event: RealtimeEvent) => {
			if (!isMessageCreatedEvent(event)) {
				return;
			}

			if (!realConversationId) {
				return;
			}

			if (event.data.conversationId !== realConversationId) {
				return;
			}

			console.log("[Support Widget] Realtime message received", {
				conversationId: event.data.conversationId,
				messageId: event.data.message.id,
				origin:
					event.data.message.visitorId === visitor?.id ? "self" : "remote",
			});

			const message: MessageType = {
				id: event.data.message.id,
				bodyMd: event.data.message.bodyMd,
				type: event.data.message.type as MessageType["type"],
				userId: event.data.message.userId,
				aiAgentId: event.data.message.aiAgentId,
				parentMessageId: event.data.message.parentMessageId,
				modelUsed: event.data.message.modelUsed,
				visitorId: event.data.message.visitorId,
				conversationId: event.data.message.conversationId,
				createdAt: new Date(event.data.message.createdAt),
				updatedAt: new Date(event.data.message.updatedAt),
				deletedAt: event.data.message.deletedAt
					? new Date(event.data.message.deletedAt)
					: null,
				visibility: event.data.message.visibility as MessageType["visibility"],
			};

			addRealtimeSupportMessageToCache(
				queryClient,
				event.data.conversationId,
				message
			);
		},
		[queryClient, realConversationId, visitor?.id]
	);

	const { isConnected: isRealtimeConnected } = useRealtimeSupport({
		onEvent: handleRealtimeEvent,
	});

	React.useEffect(() => {
		if (!realConversationId) {
			return;
		}

		if (isRealtimeConnected) {
			console.log("[Support Widget] WebSocket connected", {
				conversationId: realConversationId,
			});
		}
	}, [isRealtimeConnected, realConversationId]);

	const handleSubmit = React.useCallback(() => {
		if (!message.trim() && files.length === 0) {
			return;
		}

		sendMessage.mutate({
			conversationId: realConversationId,
			message: message.trim(),
			files,
			defaultMessages,
			visitorId: visitor?.id,
			onSuccess: (newConversationId, messageId) => {
				// If we created a new conversation, replace the current navigation state
				// to avoid having to click back twice
				if (
					!hasRealConversation &&
					newConversationId !== PENDING_CONVERSATION_ID
				) {
					replace({
						page: "CONVERSATION",
						params: { conversationId: newConversationId },
					});
				}

				setMessage("");
			},
			onError: (_error) => {
				console.error("Failed to send message:", _error);
			},
		});
	}, [
		message,
		files,
		realConversationId,
		hasRealConversation,
		defaultMessages,
		visitor?.id,
		sendMessage,
		replace,
		setMessage,
	]);

	// Use our custom submit handler instead of the passed one
	const actualMessages = fetchedMessages || messages;
	const actualIsSubmitting = isSubmitting || sendMessage.isPending;
	const actualError = error || messagesError;

	const handleGoBack = () => {
		if (canGoBack) {
			goBack();
		} else {
			navigate({
				page: "HOME",
			});
		}
	};

	return (
		<div className="flex h-full flex-col gap-0 overflow-hidden">
			<Header onGoBack={handleGoBack}>
				<div className="flex w-full items-center justify-between gap-2 py-3">
					<div className="flex flex-col">
						<p className="font-medium text-sm">{website?.name}</p>
						<p className="text-muted-foreground text-sm">Support online</p>
					</div>
					<AvatarStack
						aiAgents={availableAIAgents}
						gapWidth={2}
						humanAgents={availableHumanAgents}
						size={28}
						spacing={24}
					/>
				</div>
			</Header>

			<MessageList
				availableAIAgents={availableAIAgents}
				availableHumanAgents={availableHumanAgents}
				className="min-h-0 flex-1"
				currentVisitorId={visitor?.id}
				events={events}
				messages={actualMessages}
			/>

			<div className="flex-shrink-0 p-1">
				<MultimodalInput
					disabled={actualIsSubmitting}
					error={actualError}
					files={files}
					isSubmitting={actualIsSubmitting}
					onChange={setMessage}
					onFileSelect={addFiles}
					onRemoveFile={removeFile}
					onSubmit={handleSubmit}
					placeholder="Type your message..."
					value={message}
				/>
			</div>
		</div>
	);
};
