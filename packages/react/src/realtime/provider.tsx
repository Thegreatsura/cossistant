"use client";

import {
	type AnyRealtimeEvent,
	isValidEventType,
	type RealtimeEvent,
	validateRealtimeEvent,
} from "@cossistant/types/realtime-events";
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
import useWebSocket, { ReadyState } from "react-use-websocket";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 45_000;

type SubscribeHandler = (event: AnyRealtimeEvent) => void;

type MessageDecodeResult =
	| {
			type: "raw-text";
			data: string;
	  }
	| {
			type: "unsupported";
	  };

type ParsedMessage =
	| {
			type: "pong";
	  }
	| {
			type: "connection-established";
			connectionId: string | null;
	  }
	| {
			type: "error";
			message: string;
	  }
	| {
			type: "event";
			event: AnyRealtimeEvent;
	  }
	| {
			type: "invalid";
	  };

type VisitorAuthConfig = {
	kind: "visitor";
	visitorId: string | null;
	websiteId?: string | null;
	publicKey?: string | null;
};

type SessionAuthConfig = {
	kind: "session";
	sessionToken: string | null;
	websiteId?: string | null;
	userId?: string | null;
};

type RealtimeAuthConfig = VisitorAuthConfig | SessionAuthConfig;

type ResolvedAuthConfig = {
	type: "visitor" | "session";
	visitorId: string | null;
	websiteId: string | null;
	userId: string | null;
	sessionToken: string | null;
	publicKey: string | null;
};

type RealtimeAuthIdentity = Pick<
	ResolvedAuthConfig,
	"visitorId" | "websiteId" | "userId"
>;

type RealtimeProviderProps = {
	children: React.ReactNode;
	wsUrl?: string;
	auth: RealtimeAuthConfig | null;
	autoConnect?: boolean;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onError?: (error: Error) => void;
};

type RealtimeConnectionState = {
	isConnected: boolean;
	isConnecting: boolean;
	error: Error | null;
	send: (event: AnyRealtimeEvent) => void;
	sendRaw: (data: string) => void;
	subscribe: (handler: SubscribeHandler) => () => void;
	lastEvent: AnyRealtimeEvent | null;
	connectionId: string | null;
	reconnect: () => void;
};

type RealtimeContextValue = RealtimeConnectionState & {
	visitorId: string | null;
	websiteId: string | null;
	userId: string | null;
};

const DEFAULT_WS_URL = "wss://api.cossistant.com/ws";

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Decodes WebSocket message data into a string.
 * Handles string, ArrayBuffer, and ArrayBufferView formats.
 */
function decodeMessageData(data: unknown): MessageDecodeResult {
	if (typeof data === "string") {
		return { type: "raw-text", data };
	}

	if (data instanceof ArrayBuffer) {
		try {
			return { type: "raw-text", data: new TextDecoder().decode(data) };
		} catch {
			return { type: "unsupported" };
		}
	}

	if (ArrayBuffer.isView(data)) {
		try {
			return { type: "raw-text", data: new TextDecoder().decode(data.buffer) };
		} catch {
			return { type: "unsupported" };
		}
	}

	return { type: "unsupported" };
}

/**
 * Safely parses JSON string, returning null if invalid.
 */
function parseJson(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/**
 * Extracts a string field from an unknown object, with optional validation.
 */
function extractStringField(
	obj: unknown,
	field: string,
	required = false
): string | null {
	if (!obj || typeof obj !== "object" || !(field in obj)) {
		return required ? null : null;
	}
	const value = (obj as Record<string, unknown>)[field];
	if (typeof value === "string" && value.length > 0) {
		return value;
	}
	return required ? null : null;
}

/**
 * Parses a WebSocket message and determines its type and content.
 */
function parseWebSocketMessage(rawText: string): ParsedMessage {
	// Handle pong heartbeat
	if (rawText === "pong") {
		return { type: "pong" };
	}

	// Try to parse as JSON
	const parsed = parseJson(rawText);
	if (!parsed || typeof parsed !== "object") {
		return { type: "invalid" };
	}

	const messageType = extractStringField(parsed, "type");

	// Handle CONNECTION_ESTABLISHED
	if (messageType === "CONNECTION_ESTABLISHED") {
		const payload = (parsed as { payload?: unknown }).payload;
		const connectionId = extractStringField(payload, "connectionId");
		return { type: "connection-established", connectionId };
	}

	// Handle error messages
	if ("error" in parsed && "message" in parsed) {
		const message =
			extractStringField(parsed, "message") || "Realtime connection error";
		return { type: "error", message };
	}

	// Handle realtime events
	if (messageType && isValidEventType(messageType)) {
		try {
			const event = constructRealtimeEvent(parsed);
			if (!event) {
				return { type: "invalid" };
			}
			return { type: "event", event };
		} catch (error) {
			console.error("[Realtime] Failed to construct event", error);
			return { type: "invalid" };
		}
	}

	return { type: "invalid" };
}

/**
 * Constructs a RealtimeEvent from parsed JSON data.
 * Returns null if required fields are missing or validation fails.
 */
function constructRealtimeEvent(parsed: unknown): AnyRealtimeEvent | null {
	if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
		return null;
	}

	const type = (parsed as { type: unknown }).type;
	if (!isValidEventType(type)) {
		return null;
	}

	const eventType = type;

	// Extract payload directly
	const payloadSource = (parsed as { payload?: unknown }).payload;

	let payload: unknown;
	try {
		payload = validateRealtimeEvent(eventType, payloadSource);
	} catch (error) {
		console.error("[Realtime] Received invalid event payload", error);
		return null;
	}

	const organizationId = extractStringField(
		payloadSource,
		"organizationId",
		true
	);
	const websiteId = extractStringField(payloadSource, "websiteId", true);

	if (!organizationId) {
		console.error("[Realtime] Received event without organizationId", parsed);
		return null;
	}

	if (!websiteId) {
		console.error("[Realtime] Received event without websiteId", parsed);
		return null;
	}

	const visitorId = extractStringField(parsed, "visitorId");

	return {
		type: eventType,
		payload,
		organizationId,
		websiteId,
		visitorId,
	} as AnyRealtimeEvent;
}

/**
 * Checks if heartbeat has timed out.
 * Only call this function in browser context (inside effects or event handlers).
 */
function isHeartbeatTimedOut(
	lastHeartbeat: number,
	timeoutMs: number
): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	const elapsed = Date.now() - lastHeartbeat;
	return elapsed > timeoutMs;
}

function resolvePublicKey(explicit?: string | null): string | null {
	const trimmed = explicit?.trim();
	if (trimmed) {
		return trimmed;
	}

	const processEnv = typeof process !== "undefined" ? process.env : undefined;

	// Next.js: NEXT_PUBLIC_COSSISTANT_API_KEY
	// React/other: COSSISTANT_API_KEY
	const fromEnv =
		processEnv?.NEXT_PUBLIC_COSSISTANT_API_KEY ||
		processEnv?.COSSISTANT_API_KEY ||
		null;

	const normalized = fromEnv?.trim();
	return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeAuth(
	auth: RealtimeAuthConfig | null
): ResolvedAuthConfig | null {
	if (!auth) {
		return null;
	}

	if (auth.kind === "visitor") {
		const visitorId = auth.visitorId?.trim() || null;

		if (!visitorId) {
			return null;
		}

		return {
			type: "visitor",
			visitorId,
			websiteId: auth.websiteId?.trim() || null,
			userId: null,
			sessionToken: null,
			publicKey: resolvePublicKey(auth.publicKey ?? null),
		} satisfies ResolvedAuthConfig;
	}

	const sessionToken = auth.sessionToken?.trim() || null;

	if (!sessionToken) {
		return null;
	}

	return {
		type: "session",
		visitorId: null,
		websiteId: auth.websiteId?.trim() || null,
		userId: auth.userId?.trim() || null,
		sessionToken,
		publicKey: null,
	} satisfies ResolvedAuthConfig;
}

function toRealtimeAuthIdentity(
	auth: ResolvedAuthConfig | null
): RealtimeAuthIdentity {
	return {
		visitorId: auth?.visitorId ?? null,
		websiteId: auth?.websiteId ?? null,
		userId: auth?.userId ?? null,
	};
}

function hasRealtimeAuthIdentityChanged(
	previous: RealtimeAuthIdentity,
	next: RealtimeAuthIdentity
): boolean {
	return (
		previous.visitorId !== next.visitorId ||
		previous.websiteId !== next.websiteId ||
		previous.userId !== next.userId
	);
}

function buildSocketUrl(
	baseUrl: string,
	auth: ResolvedAuthConfig | null
): string | null {
	if (!auth) {
		return null;
	}

	try {
		const url = new URL(baseUrl);

		if (auth.type === "visitor") {
			url.searchParams.set("visitorId", auth.visitorId ?? "");
			const publicKey = auth.publicKey;
			if (publicKey) {
				url.searchParams.set("publicKey", publicKey);
			}
		} else {
			url.searchParams.set("sessionToken", auth.sessionToken ?? "");
			if (auth.websiteId) {
				url.searchParams.set("websiteId", auth.websiteId);
			}
		}

		return url.toString();
	} catch (error) {
		console.error("[Realtime] Failed to build WebSocket URL", error);
		return null;
	}
}

/**
 * Internal component that handles the WebSocket connection.
 */
function RealtimeProviderInternal({
	children,
	wsUrl = DEFAULT_WS_URL,
	auth,
	autoConnect,
	onConnect,
	onDisconnect,
	onError,
}: RealtimeProviderProps): React.ReactElement {
	const normalizedAuth = normalizeAuth(auth);
	const authIdentity = useMemo(
		() => toRealtimeAuthIdentity(normalizedAuth),
		[
			normalizedAuth?.visitorId,
			normalizedAuth?.websiteId,
			normalizedAuth?.userId,
		]
	);

	const socketUrl = buildSocketUrl(wsUrl, normalizedAuth);
	const eventHandlersRef = useRef<Set<SubscribeHandler>>(new Set());
	const lastHeartbeatRef = useRef<number>(0);
	const hasOpenedRef = useRef(false);
	const previousAuthIdentityRef = useRef(authIdentity);
	const previousUrlRef = useRef<string | null>(null);
	const [connectionError, setConnectionError] = useState<Error | null>(null);
	const [lastEvent, setLastEvent] = useState<AnyRealtimeEvent | null>(null);
	const [connectionId, setConnectionId] = useState<string | null>(null);

	const heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
	const heartbeatTimeoutMs = DEFAULT_HEARTBEAT_TIMEOUT_MS;

	const canConnect = Boolean(autoConnect && socketUrl);
	const connectionUrl = canConnect ? socketUrl : null;

	// Reset connection metadata when auth identity changes without remounting descendants.
	useEffect(() => {
		const previous = previousAuthIdentityRef.current;
		const hasIdentityChanged = hasRealtimeAuthIdentityChanged(
			previous,
			authIdentity
		);

		if (hasIdentityChanged) {
			hasOpenedRef.current = false;
			lastHeartbeatRef.current = 0;
			setConnectionId(null);
			setLastEvent(null);
			setConnectionError(null);
		}

		previousAuthIdentityRef.current = authIdentity;
	}, [authIdentity]);

	// Track URL changes to detect when connection is being replaced
	useEffect(() => {
		if (connectionUrl !== previousUrlRef.current) {
			previousUrlRef.current = connectionUrl;
			// Reset hasOpenedRef when URL changes so we know a new connection is starting
			hasOpenedRef.current = false;
		}
	}, [connectionUrl]);

	const {
		sendMessage,
		sendJsonMessage,
		lastMessage,
		readyState,
		getWebSocket,
	} = useWebSocket(
		connectionUrl,
		{
			shouldReconnect: (closeEvent) => {
				if (!canConnect) {
					return false;
				}

				if (closeEvent.code === 1008 || closeEvent.code === 1011) {
					const err = new Error(
						closeEvent.reason ||
							"Realtime connection closed by server. Please check your credentials."
					);
					setConnectionError(err);
					onError?.(err);
					return false;
				}

				return true;
			},
			reconnectAttempts: autoConnect ? undefined : 0,
			reconnectInterval: (attempt) => {
				const base = 500 * 2 ** attempt;
				return Math.min(base, 30_000);
			},
			retryOnError: false,
			onOpen: () => {
				hasOpenedRef.current = true;
				setConnectionError(null);
				lastHeartbeatRef.current =
					typeof window !== "undefined" ? Date.now() : 0;
				onConnect?.();
			},
			onClose: () => {
				setConnectionId(null);
				onDisconnect?.();
			},
			onError: (event) => {
				if (!canConnect) {
					return;
				}

				const socketLike = event.target;
				const currentSocket = getWebSocket();
				const isBrowserSocket =
					typeof WebSocket !== "undefined" && socketLike instanceof WebSocket;
				const socketState = isBrowserSocket ? socketLike.readyState : undefined;

				// Only suppress errors for THIS provider's socket, not other nested providers
				// Check if the errored socket belongs to this provider instance
				const isThisProvidersSocket = currentSocket === socketLike;

				// Suppress errors if:
				// 1. This socket was replaced (URL changed while connecting) - only for this provider
				// 2. Connection URL is null (component unmounting or disabled)
				// 3. Socket is in CLOSING/CLOSED state and hasn't opened (cleanup/unmount) - only for this provider
				if (
					(!isThisProvidersSocket && currentSocket) ||
					!connectionUrl ||
					(isThisProvidersSocket &&
						!hasOpenedRef.current &&
						(socketState === WebSocket.CLOSING ||
							socketState === WebSocket.CLOSED))
				) {
					// Suppress these expected errors during connection replacement or cleanup
					// But only if it's THIS provider's socket being replaced
					return;
				}

				// For errors that occur during CONNECTING state, check if URL changed
				// Only suppress if it's this provider's socket
				if (
					isThisProvidersSocket &&
					!hasOpenedRef.current &&
					socketState === WebSocket.CONNECTING &&
					connectionUrl !== previousUrlRef.current
				) {
					// URL changed while connecting, suppress error
					return;
				}

				const err = new Error(`WebSocket error: ${event.type}`);
				setConnectionError(err);
				onError?.(err);
			},
		},
		canConnect
	);

	useEffect(() => {
		if (!lastMessage) {
			return;
		}

		// Decode message data from various formats
		const decoded = decodeMessageData(lastMessage.data);
		if (decoded.type === "unsupported") {
			return;
		}

		// Parse the message and determine its type
		const message = parseWebSocketMessage(decoded.data);

		// Handle different message types
		switch (message.type) {
			case "pong":
				lastHeartbeatRef.current =
					typeof window !== "undefined" ? Date.now() : 0;
				break;

			case "connection-established":
				setConnectionId(message.connectionId);
				lastHeartbeatRef.current =
					typeof window !== "undefined" ? Date.now() : 0;
				break;

			case "error": {
				const err = new Error(message.message);
				setConnectionError(err);
				onError?.(err);
				break;
			}

			case "event":
				lastHeartbeatRef.current =
					typeof window !== "undefined" ? Date.now() : 0;
				setLastEvent(message.event);
				for (const handler of eventHandlersRef.current) {
					Promise.resolve(handler(message.event)).catch((error) => {
						const err =
							error instanceof Error
								? error
								: new Error(`Subscriber threw an exception: ${String(error)}`);
						onError?.(err);
					});
				}
				break;

			default:
				// Silently ignore invalid or unknown messages
				break;
		}
	}, [lastMessage, onError]);

	useEffect(() => {
		if (!canConnect) {
			return;
		}

		const interval = window.setInterval(() => {
			if (readyState !== ReadyState.OPEN) {
				return;
			}

			// Check if heartbeat has timed out (skip if connection hasn't opened yet)
			if (
				lastHeartbeatRef.current !== 0 &&
				isHeartbeatTimedOut(lastHeartbeatRef.current, heartbeatTimeoutMs)
			) {
				const socket = getWebSocket();
				socket?.close(4000, "Heartbeat timeout");
				return;
			}

			// Send ping to keep connection alive
			try {
				sendMessage("ping");
			} catch {
				// Ignore send failures; reconnect logic will handle it
			}
		}, heartbeatIntervalMs);

		return () => {
			window.clearInterval(interval);
		};
	}, [
		canConnect,
		heartbeatIntervalMs,
		heartbeatTimeoutMs,
		readyState,
		sendMessage,
		getWebSocket,
	]);

	const send = useCallback(
		(event: AnyRealtimeEvent) => {
			if (!connectionUrl) {
				throw new Error("Realtime connection is disabled");
			}

			if (readyState !== ReadyState.OPEN) {
				throw new Error("Realtime connection is not established");
			}

			sendJsonMessage(event);
		},
		[connectionUrl, readyState, sendJsonMessage]
	);

	const sendRaw = useCallback(
		(data: string) => {
			if (!connectionUrl) {
				throw new Error("Realtime connection is disabled");
			}

			if (readyState !== ReadyState.OPEN) {
				throw new Error("Realtime connection is not established");
			}

			sendMessage(data);
		},
		[connectionUrl, readyState, sendMessage]
	);

	const subscribe = useCallback((handler: SubscribeHandler) => {
		eventHandlersRef.current.add(handler);
		return () => {
			eventHandlersRef.current.delete(handler);
		};
	}, []);

	const reconnect = useCallback(() => {
		const socket = getWebSocket();
		socket?.close();
	}, [getWebSocket]);

	const connection = useMemo<RealtimeConnectionState>(
		() => ({
			isConnected: readyState === ReadyState.OPEN,
			isConnecting: readyState === ReadyState.CONNECTING,
			error: connectionError,
			send,
			sendRaw,
			subscribe,
			lastEvent,
			connectionId,
			reconnect,
		}),
		[
			readyState,
			connectionError,
			send,
			sendRaw,
			subscribe,
			lastEvent,
			connectionId,
			reconnect,
		]
	);

	const value = useMemo<RealtimeContextValue>(
		() => ({
			...connection,
			visitorId: normalizedAuth?.visitorId ?? null,
			websiteId: normalizedAuth?.websiteId ?? null,
			userId: normalizedAuth?.userId ?? null,
		}),
		[
			connection,
			normalizedAuth?.visitorId,
			normalizedAuth?.websiteId,
			normalizedAuth?.userId,
		]
	);

	return (
		<RealtimeContext.Provider value={value}>
			{children}
		</RealtimeContext.Provider>
	);
}

/**
 * Provides websocket connectivity and heartbeating logic for realtime events.
 */
export function RealtimeProvider({
	children,
	wsUrl = DEFAULT_WS_URL,
	auth,
	autoConnect = true,
	onConnect,
	onDisconnect,
	onError,
}: RealtimeProviderProps): React.ReactElement {
	return (
		<RealtimeProviderInternal
			auth={auth}
			autoConnect={autoConnect}
			onConnect={onConnect}
			onDisconnect={onDisconnect}
			onError={onError}
			wsUrl={wsUrl}
		>
			{children}
		</RealtimeProviderInternal>
	);
}

/**
 * Returns the realtime connection context.
 */
export function useRealtimeConnection(): RealtimeContextValue {
	const context = useContext(RealtimeContext);
	if (!context) {
		throw new Error(
			"useRealtimeConnection must be used within RealtimeProvider"
		);
	}

	return context;
}

export type { RealtimeContextValue };
export type { RealtimeAuthConfig };
export type { RealtimeProviderProps };
export type { RealtimeEvent } from "@cossistant/types/realtime-events";
