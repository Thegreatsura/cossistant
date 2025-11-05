import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationTimelineItem } from "@/data/conversation-message-cache";
import { useAnimationScheduler } from "@/hooks/use-animation-scheduler";
import type { FakeTypingVisitor } from "../fake-dashboard/data";

const ANTHONY_RIERA_ID = "01JGUSER1111111111111111";
const MARC_VISITOR_ID = "01JGVIS22222222222222222";
const CONVERSATION_ID = "01JGAA2222222222222222222";

// Helper to simulate character-by-character typing preview
const createTypingPreview = (fullText: string, progress: number): string => {
	const charsToShow = Math.floor((fullText.length * progress) / 100);
	return fullText.slice(0, charsToShow);
};

type UseFakeSupportWidgetConversationProps = {
	isPlaying: boolean;
	onComplete?: () => void;
};

/**
 * Hook to manage the conversation animation state.
 * Handles visitor asking about docs and Anthony responding.
 */
export function useFakeSupportWidgetConversation({
	isPlaying,
	onComplete,
}: UseFakeSupportWidgetConversationProps) {
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

	// Simulate the conversation timeline
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

			// 1. Visitor starts typing their message (simulate typing)
			const visitorMessageText = "Where is the Cossistant documentation?";
			const visitorTypingDuration = 2000; // 2 seconds
			const visitorTypingSteps = 10;
			const visitorTypingInterval = visitorTypingDuration / visitorTypingSteps;

			for (let step = 1; step <= visitorTypingSteps; step++) {
				currentSchedule(step * visitorTypingInterval, () => {
					setTypingVisitors([
						{
							conversationId: CONVERSATION_ID,
							visitorId: MARC_VISITOR_ID,
							preview: createTypingPreview(
								visitorMessageText,
								(step / visitorTypingSteps) * 100
							),
						},
					]);
				});
			}

			// 2. Visitor sends message after typing (2s)
			currentSchedule(2000, () => {
				setTypingVisitors([]);
				const visitorMessage = createMessage({
					id: "01JGTIM33333333333333331",
					text: visitorMessageText,
					userId: null,
					visitorId: MARC_VISITOR_ID,
					timestamp: new Date(now.getTime() + 2000),
				});
				setTimelineItems([visitorMessage]);
				hasInitializedRef.current = true;
			});

			// 3. Anthony joins the conversation after 2.5 seconds
			currentSchedule(2500, () => {
				const joinedEvent = createEvent(
					"01JGEVE33333333333333331",
					"participant_joined",
					ANTHONY_RIERA_ID,
					new Date(now.getTime() + 2500)
				);
                                appendTimelineItems(joinedEvent);
                        });

			// 4. Show Anthony typing indicator (3s - 5.5s)
			const anthonyResponseText =
				"You can find the Cossistant docs at cossistant.com/docs";
			const anthonyTypingDuration = 2500; // 2.5 seconds

			// Show typing indicator for Anthony
			currentSchedule(3000, () => {
				setTypingVisitors([
					{
						conversationId: CONVERSATION_ID,
						visitorId: ANTHONY_RIERA_ID,
						preview: "",
					},
				]);
			});

			// 5. Anthony sends response after 5.5 seconds
			currentSchedule(5500, () => {
				setTypingVisitors([]);
				const anthonyMessage = createMessage({
					id: "01JGTIM33333333333333332",
					text: anthonyResponseText,
					userId: ANTHONY_RIERA_ID,
					visitorId: null,
					timestamp: new Date(now.getTime() + 5500),
				});
                                appendTimelineItems(anthonyMessage);
                        });

			// Animation completes after 7 seconds
			if (onCompleteRef.current) {
				currentSchedule(20_000, () => {
					if (onCompleteRef.current) {
						onCompleteRef.current();
					}
				});
			}
		};

		// Start scheduling (with retry if schedule not ready)
                scheduleTasks();
        }, [appendTimelineItems, isPlaying]);

	return {
		timelineItems,
		typingVisitors,
		resetDemoData,
	};
}
