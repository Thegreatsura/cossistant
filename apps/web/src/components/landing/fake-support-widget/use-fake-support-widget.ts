import type { ConversationHeader } from "@cossistant/types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import { useAnimationScheduler } from "@/hooks/use-animation-scheduler";
import {
	createMarcConversation,
	type FakeTypingVisitor,
	marcVisitor,
} from "../fake-dashboard/data";

const ANTHONY_RIERA_ID = "01JGUSER1111111111111111";
const MARC_VISITOR_ID = "01JGVIS22222222222222222";
const CONVERSATION_ID = "01JGAA2222222222222222222";

// Helper to simulate character-by-character typing preview
const createTypingPreview = (fullText: string, progress: number): string => {
	const charsToShow = Math.floor((fullText.length * progress) / 100);
	return fullText.slice(0, charsToShow);
};

type UseFakeSupportWidgetProps = {
	isPlaying: boolean;
	onComplete?: () => void;
	initialMessage?: string;
};

export function useFakeSupportWidget({
	isPlaying,
	onComplete,
	initialMessage = "Hey! The widget isn't loading on my production site. It works fine locally though.",
}: UseFakeSupportWidgetProps) {
	const conversation = createMarcConversation(initialMessage, new Date());

	const [timelineItems, setTimelineItems] = useState<
		ConversationTimelineItem[]
	>([]);
	const [typingVisitors, setTypingVisitors] = useState<FakeTypingVisitor[]>([]);
	const hasScheduledRef = useRef(false);
	const scheduleRef = useRef<
		((timeMs: number, callback: () => void) => () => void) | null
	>(null);
	const onCompleteRef = useRef(onComplete);
	const hasInitializedRef = useRef(false);

	// Keep refs updated
	useEffect(() => {
		onCompleteRef.current = onComplete;
	}, [onComplete]);

	const { schedule, reset: resetScheduler } = useAnimationScheduler({
		isPlaying,
		onComplete,
	});

	// Keep schedule ref updated
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

			// Initialize timeline with initial message if not already initialized
			if (!hasInitializedRef.current) {
				const firstMessage = createMessage({
					id: "01JGTIM22222222222222222",
					text: initialMessage,
					userId: null,
					visitorId: MARC_VISITOR_ID,
					timestamp: new Date(now.getTime()),
				});
				setTimelineItems([firstMessage]);
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
				setTimelineItems((prev) => [...prev, joinedEvent]);
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
				setTimelineItems((prev) => [...prev, anthonyMessage]);
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
				setTimelineItems((prev) => [...prev, anthonyMessage2]);
			});

			// 4. Anthony's response about CORS after 5 seconds
			currentSchedule(5000, () => {
				const anthonyMessage3 = createMessage({
					id: "01JGTIM22222222222222225",
					text: "CORS errors usually mean the domain isn't added to your allowed origins.",
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 5000),
				});
				setTimelineItems((prev) => [...prev, anthonyMessage3]);
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
				setTimelineItems((prev) => [...prev, anthonyMessage4]);
			});

			// 5. Marc starts typing third message (with preview) after 7.5 seconds
			const thirdMessageText =
				"Also tried checking the API key but it looks correct. Any ideas?";
			const typingDuration = 3500; // 3.5 seconds of typing
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
				setTimelineItems((prev) => [...prev, thirdMessage]);
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
				setTimelineItems((prev) => [...prev, anthonyMessage5]);
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
				setTimelineItems((prev) => [...prev, anthonyMessage6]);
			});

			// Animation completes after conversation animation finishes
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
	}, [isPlaying, initialMessage]); // Only depend on isPlaying and initialMessage

	return {
		conversation,
		timelineItems,
		visitor: marcVisitor,
		resetDemoData,
		typingVisitors,
	};
}
