"use client";

import type { Conversation } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import * as React from "react";

// =============================================================================
// Event Types
// =============================================================================

export type SupportEventType =
	| "conversationStart"
	| "conversationEnd"
	| "messageSent"
	| "messageReceived"
	| "error";

export type ConversationStartEvent = {
	type: "conversationStart";
	conversationId: string;
	conversation?: Conversation;
};

export type ConversationEndEvent = {
	type: "conversationEnd";
	conversationId: string;
	conversation?: Conversation;
};

export type MessageSentEvent = {
	type: "messageSent";
	conversationId: string;
	message: TimelineItem;
};

export type MessageReceivedEvent = {
	type: "messageReceived";
	conversationId: string;
	message: TimelineItem;
};

export type ErrorEvent = {
	type: "error";
	error: Error;
	context?: string;
};

export type SupportEvent =
	| ConversationStartEvent
	| ConversationEndEvent
	| MessageSentEvent
	| MessageReceivedEvent
	| ErrorEvent;

// =============================================================================
// Event Callbacks
// =============================================================================

export type SupportEventCallbacks = {
	/**
	 * Called when a new conversation is started.
	 */
	onConversationStart?: (event: ConversationStartEvent) => void;
	/**
	 * Called when a conversation ends (resolved, closed, etc.).
	 */
	onConversationEnd?: (event: ConversationEndEvent) => void;
	/**
	 * Called when the visitor sends a message.
	 */
	onMessageSent?: (event: MessageSentEvent) => void;
	/**
	 * Called when a message is received from an agent (human or AI).
	 */
	onMessageReceived?: (event: MessageReceivedEvent) => void;
	/**
	 * Called when an error occurs.
	 */
	onError?: (event: ErrorEvent) => void;
};

// =============================================================================
// Context
// =============================================================================

export type SupportEventsContextValue = {
	/**
	 * Emit an event to all registered callbacks.
	 */
	emit: <T extends SupportEvent>(event: T) => void;
	/**
	 * Subscribe to a specific event type.
	 * Returns an unsubscribe function.
	 */
	subscribe: <T extends SupportEventType>(
		type: T,
		callback: (event: Extract<SupportEvent, { type: T }>) => void
	) => () => void;
};

const SupportEventsContext =
	React.createContext<SupportEventsContextValue | null>(null);

export type SupportEventsProviderProps = SupportEventCallbacks & {
	children: React.ReactNode;
};

/**
 * Provider for support widget events.
 * Allows listening to lifecycle events like message sent/received,
 * conversation start/end, and errors.
 *
 * @example
 * <Support
 *   onMessageSent={({ message }) => console.log("Sent:", message)}
 *   onMessageReceived={({ message }) => console.log("Received:", message)}
 *   onConversationStart={({ conversationId }) => console.log("Started:", conversationId)}
 *   onError={({ error }) => console.error("Error:", error)}
 * />
 */
export const SupportEventsProvider: React.FC<SupportEventsProviderProps> = ({
	onConversationStart,
	onConversationEnd,
	onMessageSent,
	onMessageReceived,
	onError,
	children,
}) => {
	// Store callbacks in refs to avoid stale closures
	const callbacksRef = React.useRef<SupportEventCallbacks>({
		onConversationStart,
		onConversationEnd,
		onMessageSent,
		onMessageReceived,
		onError,
	});

	// Update refs when callbacks change
	React.useEffect(() => {
		callbacksRef.current = {
			onConversationStart,
			onConversationEnd,
			onMessageSent,
			onMessageReceived,
			onError,
		};
	}, [
		onConversationStart,
		onConversationEnd,
		onMessageSent,
		onMessageReceived,
		onError,
	]);

	// Additional subscribers (for internal use)
	const subscribersRef = React.useRef<
		Map<SupportEventType, Set<(event: SupportEvent) => void>>
	>(new Map());

	const emit = React.useCallback(<T extends SupportEvent>(event: T) => {
		// Call the prop callback
		switch (event.type) {
			case "conversationStart":
				callbacksRef.current.onConversationStart?.(event);
				break;
			case "conversationEnd":
				callbacksRef.current.onConversationEnd?.(event);
				break;
			case "messageSent":
				callbacksRef.current.onMessageSent?.(event);
				break;
			case "messageReceived":
				callbacksRef.current.onMessageReceived?.(event);
				break;
			case "error":
				callbacksRef.current.onError?.(event);
				break;
			default:
				// Unknown event type - no callback to call
				break;
		}

		// Call any additional subscribers
		const subscribers = subscribersRef.current.get(event.type);
		if (subscribers) {
			for (const callback of subscribers) {
				callback(event);
			}
		}
	}, []);

	const subscribe = React.useCallback(
		<T extends SupportEventType>(
			type: T,
			callback: (event: Extract<SupportEvent, { type: T }>) => void
		) => {
			if (!subscribersRef.current.has(type)) {
				subscribersRef.current.set(type, new Set());
			}
			const subscribers = subscribersRef.current.get(type);
			subscribers?.add(callback as (event: SupportEvent) => void);

			// Return unsubscribe function
			return () => {
				subscribers?.delete(callback as (event: SupportEvent) => void);
			};
		},
		[]
	);

	const value = React.useMemo<SupportEventsContextValue>(
		() => ({ emit, subscribe }),
		[emit, subscribe]
	);

	return (
		<SupportEventsContext.Provider value={value}>
			{children}
		</SupportEventsContext.Provider>
	);
};

/**
 * Access the events context.
 * Returns null if not inside a SupportEventsProvider.
 */
export function useSupportEvents(): SupportEventsContextValue | null {
	return React.useContext(SupportEventsContext);
}

/**
 * Hook to emit events from within the widget.
 * Safe to use outside of provider (will no-op).
 */
export function useSupportEventEmitter() {
	const events = useSupportEvents();

	return React.useMemo(
		() => ({
			emitConversationStart: (
				conversationId: string,
				conversation?: Conversation
			) => {
				events?.emit({
					type: "conversationStart",
					conversationId,
					conversation,
				});
			},
			emitConversationEnd: (
				conversationId: string,
				conversation?: Conversation
			) => {
				events?.emit({
					type: "conversationEnd",
					conversationId,
					conversation,
				});
			},
			emitMessageSent: (conversationId: string, message: TimelineItem) => {
				events?.emit({
					type: "messageSent",
					conversationId,
					message,
				});
			},
			emitMessageReceived: (conversationId: string, message: TimelineItem) => {
				events?.emit({
					type: "messageReceived",
					conversationId,
					message,
				});
			},
			emitError: (error: Error, context?: string) => {
				events?.emit({
					type: "error",
					error,
					context,
				});
			},
		}),
		[events]
	);
}
