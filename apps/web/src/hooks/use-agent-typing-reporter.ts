import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useTRPC } from "@/lib/trpc/client";

const SEND_INTERVAL_MS = 800;
const KEEP_ALIVE_MS = 4000;
const STOP_TYPING_DELAY_MS = 2000; // Send isTyping: false after 2 seconds of inactivity

type UseAgentTypingReporterOptions = {
	conversationId: string | null;
	websiteSlug: string;
	enabled?: boolean;
};

type UseAgentTypingReporterResult = {
	handleInputChange: (value: string) => void;
	handleSubmit: () => void;
	stop: () => void;
};

export function useAgentTypingReporter({
	conversationId,
	websiteSlug,
	enabled = true,
}: UseAgentTypingReporterOptions): UseAgentTypingReporterResult {
	const trpc = useTRPC();
	const typingActiveRef = useRef(false);
	const lastSentAtRef = useRef(0);
	const keepAliveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null
	);
	const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null
	);

	const { mutateAsync: sendTypingMutation } = useMutation(
		trpc.conversation.setTyping.mutationOptions()
	);

	const clearKeepAlive = useCallback(() => {
		if (keepAliveTimeoutRef.current) {
			clearTimeout(keepAliveTimeoutRef.current);
			keepAliveTimeoutRef.current = null;
		}
	}, []);

	const clearStopTypingTimeout = useCallback(() => {
		if (stopTypingTimeoutRef.current) {
			clearTimeout(stopTypingTimeoutRef.current);
			stopTypingTimeoutRef.current = null;
		}
	}, []);

	const sendTyping = useCallback(
		async (isTyping: boolean) => {
			if (!(enabled && conversationId && websiteSlug)) {
				return;
			}

			try {
				await sendTypingMutation({
					conversationId,
					websiteSlug,
					isTyping,
				});
			} catch (error) {
				console.error("[Dashboard] Failed to send typing event", error);
			}
		},
		[enabled, conversationId, websiteSlug, sendTypingMutation]
	);

	const scheduleKeepAlive = useCallback(() => {
		clearKeepAlive();
		keepAliveTimeoutRef.current = setTimeout(() => {
			if (typingActiveRef.current) {
				void sendTyping(true);
				scheduleKeepAlive();
			}
		}, KEEP_ALIVE_MS);
	}, [clearKeepAlive, sendTyping]);

	const scheduleStopTyping = useCallback(() => {
		clearStopTypingTimeout();
		stopTypingTimeoutRef.current = setTimeout(() => {
			if (typingActiveRef.current) {
				typingActiveRef.current = false;
				clearKeepAlive();
				void sendTyping(false);
			}
		}, STOP_TYPING_DELAY_MS);
	}, [clearStopTypingTimeout, clearKeepAlive, sendTyping]);

	const handleInputChange = useCallback(
		(value: string) => {
			if (!(enabled && conversationId && websiteSlug)) {
				return;
			}

			const trimmed = value.trim();
			const now = Date.now();

			if (trimmed.length === 0) {
				if (typingActiveRef.current) {
					typingActiveRef.current = false;
					lastSentAtRef.current = now;
					clearKeepAlive();
					clearStopTypingTimeout();
					void sendTyping(false);
				}
				return;
			}

			// Schedule auto-stop after inactivity
			scheduleStopTyping();

			if (!typingActiveRef.current) {
				typingActiveRef.current = true;
				lastSentAtRef.current = now;
				void sendTyping(true);
				scheduleKeepAlive();
				return;
			}

			if (now - lastSentAtRef.current >= SEND_INTERVAL_MS) {
				lastSentAtRef.current = now;
				void sendTyping(true);
				scheduleKeepAlive();
			}
		},
		[
			enabled,
			conversationId,
			websiteSlug,
			sendTyping,
			scheduleKeepAlive,
			scheduleStopTyping,
			clearKeepAlive,
			clearStopTypingTimeout,
		]
	);

	const handleSubmit = useCallback(() => {
		if (!typingActiveRef.current) {
			return;
		}

		typingActiveRef.current = false;
		lastSentAtRef.current = Date.now();
		clearKeepAlive();
		clearStopTypingTimeout();
		void sendTyping(false);
	}, [clearKeepAlive, clearStopTypingTimeout, sendTyping]);

	const stop = useCallback(() => {
		if (!typingActiveRef.current) {
			return;
		}

		typingActiveRef.current = false;
		lastSentAtRef.current = Date.now();
		clearKeepAlive();
		clearStopTypingTimeout();
		void sendTyping(false);
	}, [clearKeepAlive, clearStopTypingTimeout, sendTyping]);

	useEffect(() => {
		return () => {
			if (typingActiveRef.current) {
				void sendTyping(false);
			}
			clearKeepAlive();
			clearStopTypingTimeout();
		};
	}, [clearKeepAlive, clearStopTypingTimeout, sendTyping]);

	return {
		handleInputChange,
		handleSubmit,
		stop,
	};
}
