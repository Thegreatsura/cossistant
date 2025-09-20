"use client";

import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import useWebSocketLib, { ReadyState } from "react-use-websocket";

export type WebSocketContextValue = {
	isConnected: boolean;
	isConnecting: boolean;
	error: Error | null;
	send: (event: RealtimeEvent) => void;
	subscribe: (handler: (event: RealtimeEvent) => void) => () => void;
	lastMessage: RealtimeEvent | null;
	visitorId: string | null;
	websiteId: string | null;
};

type WebSocketProviderProps = {
	children: React.ReactNode;
	publicKey?: string;
	websiteId?: string;
	visitorId?: string;
	wsUrl?: string;
	autoConnect?: boolean;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onError?: (error: Error) => void;
};

const DEFAULT_WS_URL = "wss://api.cossistant.com/ws";

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
	children,
	publicKey,
	websiteId,
	visitorId: visitorIdProp,
	wsUrl = DEFAULT_WS_URL,
	autoConnect = true,
	onConnect,
	onDisconnect,
	onError,
}) => {
	const eventHandlersRef = useRef<Set<(event: RealtimeEvent) => void>>(
		new Set()
	);
	const lastMessageRef = useRef<RealtimeEvent | null>(null);

	const getOptionalPublicKey = useCallback(() => {
		const keyFromProps = publicKey?.trim();
		if (keyFromProps) {
			return keyFromProps;
		}

		const envKey =
			process.env.NEXT_PUBLIC_COSSISSTANT_KEY ||
			process.env.COSSISSTANT_PUBLIC_KEY;
		const trimmed = envKey?.trim();
		return trimmed && trimmed.length > 0 ? trimmed : null;
	}, [publicKey]);

	// Build the WebSocket URL with query parameters
	const socketUrl = useMemo(() => {
		if (!autoConnect) {
			return null;
		}

		// Don't connect if we don't have a visitor ID from props
		if (!visitorIdProp) {
			return null;
		}

		try {
			const url = new URL(wsUrl);
			const key = getOptionalPublicKey();
			if (key) {
				url.searchParams.set("publicKey", key);
			}
			// Add visitor ID as a query parameter
			url.searchParams.set("visitorId", visitorIdProp);

			return url.toString();
		} catch (err) {
			onError?.(
				err instanceof Error ? err : new Error("Failed to build WebSocket URL")
			);
			return null;
		}
	}, [wsUrl, autoConnect, getOptionalPublicKey, visitorIdProp, onError]);

	const [connectionError, setConnectionError] = useState<Error | null>(null);

	// Always call useWebSocketLib with a consistent value to avoid hook order issues
	// Use a dummy URL when we don't want to connect to ensure consistent hook calls
	const webSocketUrl = socketUrl;
	const shouldConnect = socketUrl !== null;

	const { sendMessage, lastMessage, readyState } = useWebSocketLib(
		webSocketUrl,
		{
			// Only connect if we have a valid socket URL
			shouldReconnect: shouldConnect
				? (closeEvent) => {
						// Don't reconnect if authentication failed (1008) or server error (1011)
						if (closeEvent.code === 1008 || closeEvent.code === 1011) {
							const err = new Error(
								closeEvent.reason ||
									"Authentication failed. Please check your API key configuration."
							);
							setConnectionError(err);
							onError?.(err);
							return false;
						}
						return true;
					}
				: () => false,
			reconnectAttempts: shouldConnect ? 10 : 0,
			reconnectInterval: 3000,
			onOpen: shouldConnect
				? () => {
						setConnectionError(null);
						onConnect?.();
					}
				: undefined,
			onClose: shouldConnect
				? (event) => {
						onDisconnect?.();

						// Handle authentication failures
						if (event.code === 1008 || event.code === 1011) {
							const err = new Error(
								event.reason ||
									"Connection closed due to authentication failure"
							);
							setConnectionError(err);
							onError?.(err);
						}
					}
				: undefined,
			onError: shouldConnect
				? (event) => {
						const err = new Error(`WebSocket error: ${event.type}`);
						setConnectionError(err);
						onError?.(err);
					}
				: undefined,
		}
	);

	// Parse and distribute messages to subscribers
	useEffect(() => {
		if (lastMessage !== null) {
			try {
				const data = JSON.parse(lastMessage.data);

				// Check if this is an error message from the server
				if (data.error && data.message) {
					const err = new Error(data.message);
					setConnectionError(err);
					onError?.(err);
					return;
				}

				// Otherwise, treat it as a normal event
				const event = data as RealtimeEvent;
				lastMessageRef.current = event;

				// Notify all subscribed handlers
				for (const handler of eventHandlersRef.current) {
					handler(event);
				}
			} catch {
				// Intentionally swallow to avoid console noise in production builds
			}
		}
	}, [lastMessage, onError]);

	const send = useCallback(
		(event: RealtimeEvent) => {
			if (!shouldConnect) {
				throw new Error("WebSocket connection is disabled");
			}
			if (readyState !== ReadyState.OPEN) {
				throw new Error("WebSocket is not connected");
			}
			sendMessage(JSON.stringify(event));
		},
		[sendMessage, readyState, shouldConnect]
	);

	const subscribe = useCallback((handler: (event: RealtimeEvent) => void) => {
		eventHandlersRef.current.add(handler);
		return () => {
			eventHandlersRef.current.delete(handler);
		};
	}, []);

	const value: WebSocketContextValue = useMemo(
		() => ({
			isConnected: readyState === ReadyState.OPEN,
			isConnecting: readyState === ReadyState.CONNECTING,
			error: connectionError,
			send,
			subscribe,
			lastMessage: lastMessageRef.current,
			visitorId: visitorIdProp || null,
			websiteId: websiteId || null,
		}),
		[readyState, send, subscribe, connectionError, visitorIdProp, websiteId]
	);

	return (
		<WebSocketContext.Provider value={value}>
			{children}
		</WebSocketContext.Provider>
	);
};

export const useWebSocket = (): WebSocketContextValue => {
	const context = useContext(WebSocketContext);
	if (!context) {
		throw new Error("useWebSocket must be used within WebSocketProvider");
	}
	return context;
};
