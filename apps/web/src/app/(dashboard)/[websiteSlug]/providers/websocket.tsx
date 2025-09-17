"use client";

import type {
	RealtimeEvent,
	RealtimeEventType,
} from "@cossistant/types/realtime-events";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import useWebSocketLib, { ReadyState } from "react-use-websocket";
import { useUserSession, useWebsite } from "@/contexts/website";
import { getWebSocketUrl } from "@/lib/url";

type DashboardWebSocketContextValue = {
	isConnected: boolean;
	isConnecting: boolean;
	error: Error | null;
	send: (event: RealtimeEvent) => void;
	subscribe: (handler: (event: RealtimeEvent) => void) => () => void;
	lastMessage: RealtimeEvent | null;
	userId: string | null;
	websiteId: string | null;
};

type DashboardWebSocketProviderProps = {
	children: ReactNode;
	autoConnect?: boolean;
};

const DashboardWebSocketContext =
	createContext<DashboardWebSocketContextValue | null>(null);

export function DashboardWebSocketProvider({
	children,
	autoConnect = true,
}: DashboardWebSocketProviderProps) {
	const { session, user } = useUserSession();
	const website = useWebsite();

	const [connectionError, setConnectionError] = useState<Error | null>(null);
	const [socketUrl, setSocketUrl] = useState<string | null>(null);

	const eventHandlersRef = useRef<Set<(event: RealtimeEvent) => void>>(
		new Set()
	);
	const lastMessageRef = useRef<RealtimeEvent | null>(null);

	const sessionToken = session?.token ?? null;
	const websiteId = website?.id ?? null;
	const userId = user?.id ?? null;

	useEffect(() => {
		if (!autoConnect) {
			setSocketUrl(null);
			return;
		}

		if (!sessionToken) {
			setSocketUrl(null);
			return;
		}

		try {
			const url = new URL(getWebSocketUrl());
			url.searchParams.set("sessionToken", sessionToken);
			if (websiteId) {
				url.searchParams.set("websiteId", websiteId);
			}
			setSocketUrl(url.toString());
			setConnectionError(null);
		} catch (error) {
			const err =
				error instanceof Error
					? error
					: new Error("Failed to build dashboard WebSocket URL");
			console.error("[Dashboard WS] Failed to build WebSocket URL", err);
			setConnectionError(err);
			setSocketUrl(null);
		}
	}, [autoConnect, sessionToken, websiteId]);

	useEffect(() => {
		if (!sessionToken && autoConnect) {
			console.warn(
				"[Dashboard WS] Session token missing, skipping WebSocket connection."
			);
		}
	}, [autoConnect, sessionToken]);

	const webSocketOptions = useMemo(
		() => ({
			shouldReconnect: (closeEvent: CloseEvent) => {
				if (closeEvent.code === 1008 || closeEvent.code === 1011) {
					const err = new Error(
						closeEvent.reason ||
							"Authentication failed. Please ensure your session is valid."
					);
					setConnectionError(err);
					return false;
				}
				return true;
			},
			reconnectAttempts: 10,
			reconnectInterval: 3000,
			onOpen: () => {
				setConnectionError(null);
				console.log("[Dashboard WS] Connected", {
					userId,
					websiteId,
				});
			},
			onClose: (event: CloseEvent) => {
				console.log("[Dashboard WS] Disconnected", {
					code: event.code,
					reason: event.reason,
					wasClean: event.wasClean,
				});
				if (event.code === 1008 || event.code === 1011) {
					const err = new Error(
						event.reason || "Connection closed due to authentication failure"
					);
					setConnectionError(err);
				}
			},
			onError: (event: Event) => {
				const err = new Error(`WebSocket error: ${event.type}`);
				setConnectionError(err);
				console.error("[Dashboard WS] WebSocket error", event);
			},
		}),
		[userId, websiteId]
	);

	const { sendMessage, lastMessage, readyState } = useWebSocketLib(
		socketUrl,
		webSocketOptions
	);

	const handleIncomingEvent = useCallback(
		<T extends RealtimeEventType>(event: RealtimeEvent<T>) => {
			console.log("[Dashboard WS] Event received", {
				type: event.type,
				data: event.data,
				timestamp: event.timestamp,
			});

			if (event.type === "VISITOR_CONNECTED") {
				console.log("[Dashboard WS] Visitor connected", event.data);
			}

			if (event.type === "VISITOR_DISCONNECTED") {
				console.log("[Dashboard WS] Visitor disconnected", event.data);
			}

			for (const handler of eventHandlersRef.current) {
				handler(event);
			}
		},
		[]
	);

	useEffect(() => {
		if (!lastMessage) {
			return;
		}

		try {
			const data = JSON.parse(lastMessage.data);

			if (data?.error && data?.message) {
				const err = new Error(data.message);
				setConnectionError(err);
				return;
			}

			const event = data as RealtimeEvent;
			lastMessageRef.current = event;

			handleIncomingEvent(event);
		} catch (error) {
			console.error("[Dashboard WS] Failed to parse message", error);
		}
	}, [handleIncomingEvent, lastMessage]);

	const send = useCallback(
		(event: RealtimeEvent) => {
			if (readyState !== ReadyState.OPEN) {
				throw new Error("WebSocket is not connected");
			}

			console.log("[Dashboard WS] Sending event", {
				type: event.type,
				data: event.data,
				timestamp: event.timestamp,
			});

			sendMessage(JSON.stringify(event));
		},
		[readyState, sendMessage]
	);

	const subscribe = useCallback((handler: (event: RealtimeEvent) => void) => {
		eventHandlersRef.current.add(handler);
		return () => {
			eventHandlersRef.current.delete(handler);
		};
	}, []);

	const value = useMemo<DashboardWebSocketContextValue>(
		() => ({
			isConnected: readyState === ReadyState.OPEN,
			isConnecting: readyState === ReadyState.CONNECTING,
			error: connectionError,
			send,
			subscribe,
			lastMessage: lastMessageRef.current,
			userId,
			websiteId,
		}),
		[connectionError, readyState, send, subscribe, userId, websiteId]
	);

	return (
		<DashboardWebSocketContext.Provider value={value}>
			{children}
		</DashboardWebSocketContext.Provider>
	);
}

export function useDashboardWebSocket(): DashboardWebSocketContextValue {
	const context = useContext(DashboardWebSocketContext);

	if (!context) {
		throw new Error(
			"useDashboardWebSocket must be used within a DashboardWebSocketProvider"
		);
	}

	return context;
}

type UseDashboardRealtimeOptions = {
	onEvent?: (event: RealtimeEvent) => void;
};

export function useDashboardRealtime(
	options: UseDashboardRealtimeOptions = {}
) {
	const { onEvent } = options;
	const context = useDashboardWebSocket();

	useEffect(() => {
		if (!onEvent) {
			return;
		}

		const unsubscribe = context.subscribe(onEvent);

		return unsubscribe;
	}, [context, onEvent]);

	return {
		isConnected: context.isConnected,
		isConnecting: context.isConnecting,
		error: context.error,
		send: context.send,
		lastMessage: context.lastMessage,
	};
}
