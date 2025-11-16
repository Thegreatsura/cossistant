import { ConversationStatus } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { type ReactElement, useEffect, useMemo, useRef } from "react";
import { useConversation } from "../../hooks/use-conversation";
import { useConversationPage } from "../../hooks/use-conversation-page";
import { useNewMessageSound } from "../../hooks/use-new-message-sound";
import { useSupport } from "../../provider";
import { AvatarStack } from "../components/avatar-stack";
import { ConversationTimelineList } from "../components/conversation-timeline";
import { Header } from "../components/header";
import { MultimodalInput } from "../components/multimodal-input";
import { IdentificationTimelineTool } from "../components/timeline-identification-tool";
import { useSupportConfig, useSupportNavigation } from "../store";
import { Text, useSupportText } from "../text";

type ConversationPageProps = {
	/**
	 * Page params object (for compatibility with Page component)
	 */
	params?: {
		/**
		 * The conversation ID to display (can be PENDING_CONVERSATION_ID or a real ID).
		 */
		conversationId: string;

		/**
		 * Optional initial message to send when opening the conversation.
		 */
		initialMessage?: string;

		/**
		 * Optional timeline items to display (for optimistic updates or initial state).
		 */
		items?: TimelineItem[];
	};

	// Legacy direct props support (deprecated but maintained for backward compatibility)
	conversationId?: string;
	initialMessage?: string;
	items?: TimelineItem[];
};

/**
 * Conversation page with message timeline and input composer.
 */
type ConversationPageComponent = (props: ConversationPageProps) => ReactElement;

export const ConversationPage: ConversationPageComponent = ({
	params,
	conversationId: legacyConversationId,
	initialMessage: legacyInitialMessage,
	items: legacyItems,
}: ConversationPageProps) => {
	// Support both params object (new) and direct props (legacy)
	const initialConversationId =
		params?.conversationId ?? legacyConversationId ?? "";
	const initialMessage = params?.initialMessage ?? legacyInitialMessage;
	const passedItems = params?.items ?? legacyItems ?? [];
	const { website, availableAIAgents, availableHumanAgents, visitor } =
		useSupport();
	const { navigate, replace, goBack, canGoBack } = useSupportNavigation();
	const { isOpen } = useSupportConfig();
	const text = useSupportText();
	const playNewMessageSound = useNewMessageSound({
		volume: 0.7,
		playbackRate: 1.0,
	});
	const previousItemsRef = useRef<TimelineItem[]>([]);

	const timelineTools = useMemo(
		() => ({
			identification: { component: IdentificationTimelineTool },
		}),
		[]
	);

	// Main conversation hook - handles all logic
	const conversation = useConversationPage({
		conversationId: initialConversationId,
		items: passedItems,
		initialMessage,
		autoSeenEnabled: isOpen,
		onConversationIdChange: (newConversationId) => {
			// Update navigation when conversation is created
			replace({
				page: "CONVERSATION",
				params: { conversationId: newConversationId },
			});
		},
	});

	const { conversation: activeConversation } = useConversation(
		conversation.isPending ? null : conversation.conversationId,
		{ enabled: !conversation.isPending }
	);

	const isConversationClosed = Boolean(
		activeConversation &&
			(activeConversation.status === ConversationStatus.RESOLVED ||
				activeConversation.status === ConversationStatus.SPAM ||
				activeConversation.deletedAt)
	);

	const handleGoBack = () => {
		if (canGoBack) {
			goBack();
		} else {
			navigate({ page: "HOME" });
		}
	};

	// Play sound when new messages arrive from agents (not visitor)
	useEffect(() => {
		const currentItems = conversation.items;
		const previousItems = previousItemsRef.current;

		// Check if there are new items
		if (currentItems.length > previousItems.length) {
			// Find the new items
			const newItems = currentItems.slice(previousItems.length);

			// Play sound only if new message is from agent (not visitor)
			for (const item of newItems) {
				if (item.type === "message" && !item.visitorId) {
					playNewMessageSound();
					break; // Only play once per batch
				}
			}
		}

		// Update the ref
		previousItemsRef.current = currentItems;
	}, [conversation.items, playNewMessageSound]);

	return (
		<div className="flex h-full flex-col gap-0 overflow-hidden">
			<Header onGoBack={handleGoBack}>
				<div className="flex w-full items-center justify-between gap-2 py-3">
					<div className="flex flex-col">
						<p className="font-medium text-co-primary text-sm">
							{website?.name}
						</p>
						<Text
							as="p"
							className="text-co-muted-foreground text-sm"
							textKey="common.labels.supportOnline"
						/>
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

			<ConversationTimelineList
				availableAIAgents={availableAIAgents}
				availableHumanAgents={availableHumanAgents}
				className="min-h-0 flex-1 px-4"
				conversationId={conversation.conversationId}
				currentVisitorId={visitor?.id}
				items={conversation.items}
				tools={timelineTools}
			/>

			{isConversationClosed ? (
				<div className="m-4 flex items-center justify-center text-balance px-4 pb-6 text-center font-medium text-co-muted-foreground text-sm">
					<Text as="p" textKey="component.conversationPage.closedMessage" />
				</div>
			) : (
				<div className="flex-shrink-0 p-1">
					<MultimodalInput
						disabled={conversation.composer.isSubmitting}
						error={conversation.error}
						files={conversation.composer.files}
						isSubmitting={conversation.composer.isSubmitting}
						onChange={conversation.composer.setMessage}
						onFileSelect={conversation.composer.addFiles}
						onRemoveFile={conversation.composer.removeFile}
						onSubmit={conversation.composer.submit}
						placeholder={text("component.multimodalInput.placeholder")}
						value={conversation.composer.message}
					/>
				</div>
			)}
		</div>
	);
};
