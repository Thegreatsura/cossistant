import { useConversationMessages } from "@cossistant/react/hooks/use-conversation-messages";
import type {
	ConversationEvent,
	Message as MessageType,
} from "@cossistant/types";
import React from "react";
import { useDefaultMessages } from "../../hooks/private/use-default-messages";
import { useCreateConversation } from "../../hooks/use-create-conversation";
import { useSendMessage } from "../../hooks/use-send-message";
import { useSupport } from "../../provider";
import { PENDING_CONVERSATION_ID } from "../../utils/id";
import { AvatarStack } from "../components/avatar-stack";
import { Header } from "../components/header";
import { MessageList } from "../components/message-list";
import { MultimodalInput } from "../components/multimodal-input";
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
	const { website, availableAIAgents, availableHumanAgents, client, visitor } =
		useSupport();
	const { navigate, replace, goBack, canGoBack } = useSupportNavigation();
	const lastSeenMessageIdRef = React.useRef<string | null>(null);
	const markSeenInFlightRef = React.useRef(false);

	// Determine if we have a real conversation or pending one
	const hasRealConversation = conversationId !== PENDING_CONVERSATION_ID;
	const realConversationId = hasRealConversation ? conversationId : null;
	const defaultMessages = useDefaultMessages({
		conversationId,
	});
	const { mutateAsync: initiateConversation } = useCreateConversation({
		client,
	});
	const bootstrapAttemptedRef = React.useRef(false);

	const messagesQuery = useConversationMessages(conversationId);

	// Messages are already flattened in the hook
	const fetchedMessages = messagesQuery.messages;

	const sendMessage = useSendMessage({ client });

	React.useEffect(() => {
		if (hasRealConversation || bootstrapAttemptedRef.current) {
			return;
		}

		bootstrapAttemptedRef.current = true;
		let cancelled = false;

		void initiateConversation({
			defaultMessages,
			visitorId: visitor?.id,
			websiteId: website?.id ?? null,
		})
			.then((response) => {
				if (!response || cancelled) {
					return;
				}

				replace({
					page: "CONVERSATION",
					params: { conversationId: response.conversation.id },
				});
			})
			.catch(() => {
				bootstrapAttemptedRef.current = false;
			});

		return () => {
			cancelled = true;
		};
	}, [
		hasRealConversation,
		initiateConversation,
		defaultMessages,
		replace,
		visitor?.id,
		website?.id,
	]);

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
	const actualMessages =
		fetchedMessages.length > 0
			? fetchedMessages
			: hasRealConversation
				? messages
				: defaultMessages;
	const actualIsSubmitting = isSubmitting || sendMessage.isPending;
	const actualError = error || messagesQuery.error;
	const lastMessage = React.useMemo(
		() => actualMessages.at(-1) ?? null,
		[actualMessages]
	);

	React.useEffect(() => {
		lastSeenMessageIdRef.current = null;
		markSeenInFlightRef.current = false;
	}, []);

	React.useEffect(() => {
		if (
			!(client && realConversationId && visitor?.id && lastMessage) ||
			lastMessage.visitorId === visitor.id
		) {
			if (lastMessage && lastMessage.visitorId === visitor?.id) {
				lastSeenMessageIdRef.current = lastMessage.id;
			}
			return;
		}

		if (lastSeenMessageIdRef.current === lastMessage.id) {
			return;
		}

		if (markSeenInFlightRef.current) {
			return;
		}

		markSeenInFlightRef.current = true;

		client
			.markConversationSeen({ conversationId: realConversationId })
			.then(() => {
				lastSeenMessageIdRef.current = lastMessage.id;
			})
			.catch((markSeenError) => {
				console.error("Failed to mark conversation as seen:", markSeenError);
			})
			.finally(() => {
				markSeenInFlightRef.current = false;
			});
	}, [client, realConversationId, visitor?.id, lastMessage]);

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
						size={32}
						spacing={28}
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
