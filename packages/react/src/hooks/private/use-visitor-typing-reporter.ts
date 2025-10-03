import type { CossistantClient } from "@cossistant/core";
import { useCallback, useEffect, useRef } from "react";

const PREVIEW_MAX_LENGTH = 2000;
const SEND_INTERVAL_MS = 800;
const KEEP_ALIVE_MS = 4000;

type UseVisitorTypingReporterOptions = {
	client: CossistantClient | null;
	conversationId: string | null;
};

type UseVisitorTypingReporterResult = {
	handleInputChange: (value: string) => void;
	handleSubmit: () => void;
	stop: () => void;
};

export function useVisitorTypingReporter({
	client,
	conversationId,
}: UseVisitorTypingReporterOptions): UseVisitorTypingReporterResult {
	const typingActiveRef = useRef(false);
	const lastSentAtRef = useRef(0);
	const latestPreviewRef = useRef<string>("");
	const keepAliveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null
	);

	const clearKeepAlive = useCallback(() => {
		if (keepAliveTimeoutRef.current) {
			clearTimeout(keepAliveTimeoutRef.current);
			keepAliveTimeoutRef.current = null;
		}
	}, []);

	const sendTyping = useCallback(
		async (isTyping: boolean, preview?: string | null) => {
			if (!(client && conversationId)) {
				return;
			}

			try {
				await client.setVisitorTyping({
					conversationId,
					isTyping,
					visitorPreview: preview ?? undefined,
				});
			} catch (error) {
				console.error("[Support] Failed to send typing event", error);
			}
		},
		[client, conversationId]
	);

	const scheduleKeepAlive = useCallback(() => {
		clearKeepAlive();
		keepAliveTimeoutRef.current = setTimeout(() => {
			if (typingActiveRef.current) {
				void sendTyping(true, latestPreviewRef.current);
				scheduleKeepAlive();
			}
		}, KEEP_ALIVE_MS);
	}, [clearKeepAlive, sendTyping]);

	const handleInputChange = useCallback(
		(value: string) => {
			if (!(client && conversationId)) {
				return;
			}

			const trimmed = value.trim();
			latestPreviewRef.current = trimmed.slice(0, PREVIEW_MAX_LENGTH);
			const now = Date.now();

			if (trimmed.length === 0) {
				if (typingActiveRef.current) {
					typingActiveRef.current = false;
					lastSentAtRef.current = now;
					clearKeepAlive();
					void sendTyping(false);
				}
				return;
			}

			if (!typingActiveRef.current) {
				typingActiveRef.current = true;
				lastSentAtRef.current = now;
				void sendTyping(true, latestPreviewRef.current);
				scheduleKeepAlive();
				return;
			}

			if (now - lastSentAtRef.current >= SEND_INTERVAL_MS) {
				lastSentAtRef.current = now;
				void sendTyping(true, latestPreviewRef.current);
				scheduleKeepAlive();
			}
		},
		[client, conversationId, sendTyping, scheduleKeepAlive, clearKeepAlive]
	);

	const handleSubmit = useCallback(() => {
		if (!typingActiveRef.current) {
			return;
		}

		typingActiveRef.current = false;
		lastSentAtRef.current = Date.now();
		clearKeepAlive();
		void sendTyping(false);
	}, [clearKeepAlive, sendTyping]);

	const stop = useCallback(() => {
		if (!typingActiveRef.current) {
			return;
		}

		typingActiveRef.current = false;
		lastSentAtRef.current = Date.now();
		clearKeepAlive();
		void sendTyping(false);
	}, [clearKeepAlive, sendTyping]);

	useEffect(() => {
		return () => {
			if (typingActiveRef.current) {
				void sendTyping(false);
			}
			clearKeepAlive();
		};
	}, [clearKeepAlive, sendTyping]);

	return {
		handleInputChange,
		handleSubmit,
		stop,
	};
}
