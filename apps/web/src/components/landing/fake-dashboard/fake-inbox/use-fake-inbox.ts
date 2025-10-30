import type { ConversationHeader } from "@cossistant/types";
import { useEffect, useRef, useState } from "react";
import { useAnimationScheduler } from "@/hooks/use-animation-scheduler";
import {
	createMarcConversation,
	type FakeTypingVisitor,
	fakeConversations,
} from "../data";

type UseFakeInboxProps = {
	isPlaying: boolean;
	onComplete?: () => void;
	onShowMouseCursor?: () => void;
};

export function useFakeInbox({
	isPlaying,
	onComplete,
	onShowMouseCursor,
}: UseFakeInboxProps) {
	const [conversations, setConversations] =
		useState<ConversationHeader[]>(fakeConversations);
	const [typingVisitors, setTypingVisitors] = useState<FakeTypingVisitor[]>([]);
	const [inboxMessages, setInboxMessages] = useState<
		Array<{ text: string; timestamp: Date }>
	>([]);
	const hasScheduledRef = useRef(false);
	const scheduleRef = useRef<
		((timeMs: number, callback: () => void) => () => void) | null
	>(null);
	const onShowMouseCursorRef = useRef(onShowMouseCursor);
	const retryCountRef = useRef(0);

	// Keep refs updated
	useEffect(() => {
		onShowMouseCursorRef.current = onShowMouseCursor;
	}, [onShowMouseCursor]);

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
	// Also reset when isPlaying becomes true (allows restart after reset)
	useEffect(() => {
		if (isPlaying) {
			// Allow rescheduling if we're playing
			hasScheduledRef.current = false;
			retryCountRef.current = 0;
		}
	}, [isPlaying]);

	const resetDemoData = () => {
		const marcConversationId = "01JGAA2222222222222222222";
		// Reset to initial conversations (without Marc's conversation)
		setConversations(fakeConversations);
		setTypingVisitors([]);
		setInboxMessages([]);
		resetScheduler();
		hasScheduledRef.current = false;
		retryCountRef.current = 0;
	};

	// Simulate Marc Louvion's conversation with multiple messages
	useEffect(() => {
		// Only schedule when isPlaying is true and we haven't scheduled yet
		if (!isPlaying || hasScheduledRef.current) {
			return;
		}

		const scheduleTasks = () => {
			const currentSchedule = scheduleRef.current;
			if (!currentSchedule) {
				// Schedule ref not ready yet, retry on next tick (max 10 retries)
				retryCountRef.current += 1;
				if (retryCountRef.current > 10) {
					console.warn(
						"[FakeInbox] Schedule function not available after retries"
					);
					return;
				}
				requestAnimationFrame(() => {
					setTimeout(scheduleTasks, 10);
				});
				return;
			}

			// Reset retry count on success
			retryCountRef.current = 0;

			// Mark as scheduled immediately to prevent duplicate scheduling
			hasScheduledRef.current = true;
			const marcConversationId = "01JGAA2222222222222222222";
			const marcVisitorId = "01JGVIS22222222222222222";

			// Ensure Marc's conversation is not in the initial list
			setConversations((prev) => {
				const filtered = prev.filter((c) => c.id !== marcConversationId);
				return filtered;
			});

			// Add Marc's first message after 1 second
			currentSchedule(1000, () => {
				const firstMessageText =
					"Hey! The widget isn't loading on my production site. It works fine locally though.";
				const firstTimestamp = new Date();
				const firstMessage = createMarcConversation(
					firstMessageText,
					firstTimestamp
				);
				setInboxMessages([
					{ text: firstMessageText, timestamp: firstTimestamp },
				]);
				setConversations((prev) => {
					// Remove any existing Marc conversation before adding
					const filtered = prev.filter((c) => c.id !== marcConversationId);
					return [firstMessage, ...filtered];
				});
			});

			// Marc starts typing the second message after 2.5 seconds
			currentSchedule(2500, () => {
				setTypingVisitors([
					{
						conversationId: marcConversationId,
						visitorId: marcVisitorId,
						preview: null,
					},
				]);
			});

			// Marc sends second message after 4 seconds
			currentSchedule(4000, () => {
				setTypingVisitors([]);
				const secondMessageText =
					"I checked the console and I'm getting a CORS error. Is there something I need to configure?";
				const secondTimestamp = new Date();
				const secondMessage = createMarcConversation(
					secondMessageText,
					secondTimestamp
				);
				setInboxMessages((prev) => [
					...prev,
					{ text: secondMessageText, timestamp: secondTimestamp },
				]);
				setConversations((prev) => {
					// Remove the old Marc conversation and add the updated one
					const filtered = prev.filter((c) => c.id !== marcConversationId);
					return [secondMessage, ...filtered];
				});
			});

			// Show mouse cursor right after second message (slight delay for message to appear)
			currentSchedule(4200, () => {
				// Use ref to ensure we call the latest callback
				if (onShowMouseCursorRef.current) {
					onShowMouseCursorRef.current();
				}
			});

			// Schedule completion callback - fires after mouse click animation completes
			// The mouse click will trigger the view switch, so we don't need to call onComplete here
			// Instead, onComplete will be called by the store when the mouse click happens
		};

		// Start scheduling (with retry if schedule not ready)
		scheduleTasks();
	}, [isPlaying]); // Only depend on isPlaying to prevent re-runs

	return {
		conversations,
		typingVisitors,
		resetDemoData,
		inboxMessages,
	};
}
