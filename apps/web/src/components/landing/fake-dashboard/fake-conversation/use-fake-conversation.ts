import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import { useAnimationScheduler } from "@/hooks/use-animation-scheduler";
import {
	createMarcConversation,
	type FakeTypingVisitor,
	marcVisitor,
} from "../data";

const ANTHONY_RIERA_ID = "01JGUSER1111111111111111";
const MARC_VISITOR_ID = "01JGVIS22222222222222222";
const CONVERSATION_ID = "01JGAA2222222222222222222";

// Helper to simulate character-by-character typing preview
const createTypingPreview = (fullText: string, progress: number): string => {
	const charsToShow = Math.floor((fullText.length * progress) / 100);
	return fullText.slice(0, charsToShow);
};

type UseFakeConversationProps = {
	isPlaying: boolean;
	onComplete?: () => void;
	initialMessages?: Array<{ text: string; timestamp: Date }>;
};

export function useFakeConversation({
	isPlaying,
	onComplete,
	initialMessages = [],
}: UseFakeConversationProps) {
	const conversation = createMarcConversation(
		initialMessages[0]?.text ||
			"Hey! The widget isn't loading on my production site. It works fine locally though.",
		initialMessages[0]?.timestamp || new Date()
	);

	const [timelineItems, setTimelineItems] = useState<
		ConversationTimelineItem[]
	>([]);
	const [typingVisitors, setTypingVisitors] = useState<FakeTypingVisitor[]>([]);
	const hasScheduledRef = useRef(false);
	const scheduleRef = useRef<
		((timeMs: number, callback: () => void) => () => void) | null
	>(null);
	const onCompleteRef = useRef(onComplete);
	const initialMessagesRef = useRef(initialMessages);
	const hasInitializedRef = useRef(false);

	// Keep refs updated
	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	// Track initial messages and reset initialization flag when they change (view switch)
	useEffect(() => {
		const messagesChanged =
			initialMessagesRef.current.length !== initialMessages.length ||
			initialMessagesRef.current.some(
				(msg, idx) =>
					msg.text !== initialMessages[idx]?.text ||
					msg.timestamp.getTime() !== initialMessages[idx]?.timestamp.getTime()
			);

		if (messagesChanged) {
			initialMessagesRef.current = initialMessages;
			hasInitializedRef.current = false;
			hasScheduledRef.current = false; // Allow rescheduling with new messages
		}
	}, [initialMessages]);

	const { schedule, reset: resetScheduler } = useAnimationScheduler({
		isPlaying,
		onComplete,
	});

	// Keep schedule ref updated (set synchronously and also in effect for safety)
	scheduleRef.current = schedule;
	useEffect(() => {
		scheduleRef.current = schedule;
	}, [schedule]);

	// Reset hasScheduledRef when transitioning from paused to playing
	useEffect(() => {
		if (isPlaying) {
			hasScheduledRef.current = false;
		}
	}, [isPlaying]);

	const appendTimelineItems = useCallback(
		(newItems: ConversationTimelineItem | ConversationTimelineItem[]) => {
			const itemsArray = Array.isArray(newItems) ? newItems : [newItems];
			if (itemsArray.length === 0) {
				return;
			}

			setTimelineItems((prev) => {
				const existingIds = new Set(prev.map((item) => item.id));
				let hasNewItem = false;

				const dedupedItems = itemsArray.filter((item) => {
					if (existingIds.has(item.id)) {
						return false;
					}
					existingIds.add(item.id);
					hasNewItem = true;
					return true;
				});

				if (!hasNewItem) {
					return prev;
				}

				return [...prev, ...dedupedItems];
			});
		},
		[]
	);

	const resetDemoData = useCallback(() => {
		setTimelineItems([]);
		setTypingVisitors([]);
		resetScheduler();
		hasScheduledRef.current = false;
		hasInitializedRef.current = false;
	}, [resetScheduler]);

	// Simulate the full conversation timeline with messages and events
	useEffect(() => {
		// Only schedule when isPlaying is true and we haven't scheduled yet
		if (!isPlaying || hasScheduledRef.current) {
			return;
		}

		const scheduleTasks = () => {
			const currentSchedule = scheduleRef.current;
			if (!currentSchedule) {
				// Schedule ref not ready yet, retry on next tick
				setTimeout(scheduleTasks, 10);
				return;
			}

			// Mark as scheduled immediately to prevent duplicate scheduling
			hasScheduledRef.current = true;
			const now = new Date();

			// Helper to create a message timeline item
			const createMessage = (params: {
				id: string;
				text: string;
				userId: string | null;
				visitorId: string | null;
				timestamp: Date;
			}): ConversationTimelineItem => ({
				id: params.id,
				conversationId: CONVERSATION_ID,
				organizationId: "01JGORG11111111111111111",
				visibility: "public" as const,
				type: "message" as const,
				text: params.text,
				parts: [{ type: "text" as const, text: params.text }],
				userId: params.userId,
				visitorId: params.visitorId,
				aiAgentId: null,
				createdAt: params.timestamp.toISOString(),
				deletedAt: null,
			});

			// Helper to create an event timeline item
			const createEvent = (
				id: string,
				eventType: string,
				actorUserId: string | null,
				timestamp: Date
			): ConversationTimelineItem => ({
				id,
				conversationId: CONVERSATION_ID,
				organizationId: "01JGORG11111111111111111",
				visibility: "public" as const,
				type: "event" as const,
				text: null,
				parts: [
					{
						type: "event" as const,
						eventType,
						actorUserId,
						actorAiAgentId: null,
						data: {},
					},
				],
				userId: null,
				visitorId: null,
				aiAgentId: null,
				createdAt: timestamp.toISOString(),
				deletedAt: null,
			});

			// Initialize timeline with inbox messages if provided and not already initialized
			if (!hasInitializedRef.current) {
				const initialTimelineItems: ConversationTimelineItem[] = [];

				if (initialMessagesRef.current.length > 0) {
					// Use inbox messages as starting point
					initialMessagesRef.current.forEach((msg, index) => {
						const messageId =
							index === 0
								? "01JGTIM22222222222222222"
								: index === 1
									? "01JGTIM22222222222222224"
									: `01JGTIM2222222222222222${index + 1}`;
						const message = createMessage({
							id: messageId,
							text: msg.text,
							userId: null,
							visitorId: MARC_VISITOR_ID,
							timestamp: msg.timestamp,
						});
						initialTimelineItems.push(message);
					});
				} else {
					// Fallback: start with first message if no inbox messages
					const firstMessage = createMessage({
						id: "01JGTIM22222222222222222",
						text: "Hey! The widget isn't loading on my production site. It works fine locally though.",
						userId: null,
						visitorId: MARC_VISITOR_ID,
						timestamp: new Date(now.getTime()),
					});
					initialTimelineItems.push(firstMessage);
				}

				setTimelineItems(initialTimelineItems);
				hasInitializedRef.current = true;
			}

			// 2. Anthony joins the conversation after 1.5 seconds
			currentSchedule(1500, () => {
				const joinedEvent = createEvent(
					"01JGEVE22222222222222221",
					"participant_joined",
					ANTHONY_RIERA_ID,
					new Date(now.getTime() + 1500)
				);
				appendTimelineItems(joinedEvent);
			});

			// 3. Anthony's first response after 2.5 seconds
			currentSchedule(2500, () => {
				const anthonyMessage = createMessage({
					id: "01JGTIM22222222222222223",
					text: "Hi Marc! I'll help you with that.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 2500),
				});
				appendTimelineItems(anthonyMessage);
			});

			// 3b. Anthony's second message after 3.5 seconds (grouped with first)
			currentSchedule(3500, () => {
				const anthonyMessage2 = createMessage({
					id: "01JGTIM22222222222222228",
					text: "Can you share your domain so I can check the configuration?",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 3500),
				});
				appendTimelineItems(anthonyMessage2);
			});

			// 4. Anthony's response about CORS (after seeing inbox messages) after 5 seconds
			currentSchedule(5000, () => {
				const anthonyMessage3 = createMessage({
					id: "01JGTIM22222222222222225",
					text: "CORS errors usually mean the domain isn't added to your allowed origins.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 5000),
				});
				appendTimelineItems(anthonyMessage3);
			});

			// 4b. Anthony's second message after 6 seconds (grouped with first response)
			currentSchedule(6000, () => {
				const anthonyMessage4 = createMessage({
					id: "01JGTIM22222222222222229",
					text: "Let me check your settings real quick.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 6000),
				});
				appendTimelineItems(anthonyMessage4);
			});

			// 5. Marc starts typing third message (with preview) after 7.5 seconds
			const thirdMessageText =
				"Also tried checking the API key but it looks correct. Any ideas?";
			const typingDuration = 3500; // 3.5 seconds of typing (slower, more realistic)
			const typingSteps = 10;
			const typingInterval = typingDuration / typingSteps;

			for (let step = 1; step <= typingSteps; step++) {
				currentSchedule(7500 + step * typingInterval, () => {
					setTypingVisitors([
						{
							conversationId: CONVERSATION_ID,
							visitorId: MARC_VISITOR_ID,
							preview: createTypingPreview(
								thirdMessageText,
								(step / typingSteps) * 100
							),
						},
					]);
				});
			}

			// 6. Marc sends third message after 11 seconds (7.5s base + 3.5s typing)
			currentSchedule(11_000, () => {
				setTypingVisitors([]);
				const thirdMessage = createMessage({
					id: "01JGTIM22222222222222226",
					text: thirdMessageText,
					userId: null,
					visitorId: MARC_VISITOR_ID,
					timestamp: new Date(now.getTime() + 11_000),
				});
				appendTimelineItems(thirdMessage);
			});

			// 7. Anthony's response after 12.5 seconds
			currentSchedule(12_500, () => {
				const anthonyMessage5 = createMessage({
					id: "01JGTIM22222222222222227",
					text: "I found the issue - I've added your domain to the allowed origins.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 12_500),
				});
				appendTimelineItems(anthonyMessage5);
			});

			// 7b. Anthony's second message after 13.5 seconds (grouped with first)
			currentSchedule(13_500, () => {
				const anthonyMessage6 = createMessage({
					id: "01JGTIM22222222222222230",
					text: "Can you try refreshing your site?",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 13_500),
				});
				appendTimelineItems(anthonyMessage6);
			});

			// Animation completes after conversation animation finishes (13.5 seconds + small buffer)
			if (onCompleteRef.current) {
				currentSchedule(14_000, () => {
					if (onCompleteRef.current) {
						onCompleteRef.current();
					}
				});
			}
		};

		// Start scheduling (with retry if schedule not ready)
		scheduleTasks();
	}, [appendTimelineItems, isPlaying]); // Depend on isPlaying (append helper is stable) to prevent re-runs

	return {
		conversation,
		timelineItems,
		visitor: marcVisitor,
		resetDemoData,
		typingVisitors,
	};
}
