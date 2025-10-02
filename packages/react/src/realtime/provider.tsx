"use client";

import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import {
        isValidEventType,
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

type SubscribeHandler = (event: RealtimeEvent) => void;

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
        send: (event: RealtimeEvent) => void;
        subscribe: (handler: SubscribeHandler) => () => void;
        lastEvent: RealtimeEvent | null;
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

function resolvePublicKey(explicit?: string | null): string | null {
        const trimmed = explicit?.trim();
        if (trimmed) {
                return trimmed;
        }

        const fromEnv =
                process.env.NEXT_PUBLIC_COSSISSTANT_KEY ||
                process.env.COSSISSTANT_PUBLIC_KEY ||
                null;

        const normalized = fromEnv?.trim();
        return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeAuth(auth: RealtimeAuthConfig | null): ResolvedAuthConfig | null {
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

function buildSocketUrl(baseUrl: string, auth: ResolvedAuthConfig | null): string | null {
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

export function RealtimeProvider({
        children,
        wsUrl = DEFAULT_WS_URL,
        auth,
        autoConnect = true,
        onConnect,
        onDisconnect,
        onError,
}: RealtimeProviderProps) {
        const normalizedAuth = normalizeAuth(auth);

        const socketUrl = buildSocketUrl(wsUrl, normalizedAuth);
        const eventHandlersRef = useRef<Set<SubscribeHandler>>(new Set());
        const lastHeartbeatRef = useRef<number>(Date.now());
        const [connectionError, setConnectionError] = useState<Error | null>(null);
        const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
        const [connectionId, setConnectionId] = useState<string | null>(null);

        const heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
        const heartbeatTimeoutMs = DEFAULT_HEARTBEAT_TIMEOUT_MS;

        const canConnect = Boolean(autoConnect && socketUrl);
        const connectionUrl = canConnect ? socketUrl : null;

        const {
                sendMessage,
                sendJsonMessage,
                lastMessage,
                readyState,
                getWebSocket,
                reconnect,
        } = useWebSocket(connectionUrl, {
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
                        const base = 500 * Math.pow(2, attempt);
                        return Math.min(base, 30_000);
                },
                retryOnError: false,
                onOpen: () => {
                        setConnectionError(null);
                        lastHeartbeatRef.current = Date.now();
                        onConnect?.();
                },
                onClose: () => {
                        setConnectionId(null);
                        onDisconnect?.();
                },
                onError: (event) => {
                        const err = new Error(`WebSocket error: ${event.type}`);
                        setConnectionError(err);
                        onError?.(err);
                },
        }, canConnect);

        useEffect(() => {
                if (!lastMessage) {
                        return;
                }

                let raw: string | null = null;
                if (typeof lastMessage.data === "string") {
                        raw = lastMessage.data;
                } else if (lastMessage.data instanceof ArrayBuffer) {
                        try {
                                raw = new TextDecoder().decode(lastMessage.data);
                        } catch {
                                raw = null;
                        }
                } else if (ArrayBuffer.isView(lastMessage.data)) {
                        try {
                                raw = new TextDecoder().decode(lastMessage.data.buffer);
                        } catch {
                                raw = null;
                        }
                }

                if (raw === null) {
                        return;
                }

                if (raw === "pong") {
                        lastHeartbeatRef.current = Date.now();
                        return;
                }

                let parsed: unknown;

                try {
                        parsed = JSON.parse(raw);
                } catch {
                        return;
                }

                if (
                        parsed &&
                        typeof parsed === "object" &&
                        "type" in parsed &&
                        (parsed as { type?: unknown }).type === "CONNECTION_ESTABLISHED"
                ) {
                        const payload = parsed as {
                                data?: { connectionId?: string | null };
                        };
                        const nextId = payload.data?.connectionId ?? null;
                        setConnectionId(nextId ?? null);
                        lastHeartbeatRef.current = Date.now();
                        return;
                }

                if (
                        parsed &&
                        typeof parsed === "object" &&
                        "error" in parsed &&
                        "message" in parsed
                ) {
                        const payload = parsed as { message?: unknown };
                        const err = new Error(
                                typeof payload.message === "string"
                                        ? payload.message
                                        : "Realtime connection error"
                        );
                        setConnectionError(err);
                        onError?.(err);
                        return;
                }

                if (
                        parsed &&
                        typeof parsed === "object" &&
                        "type" in parsed &&
                        isValidEventType((parsed as { type: unknown }).type)
                ) {
                        const type = (parsed as { type: RealtimeEvent["type"] }).type;
                        const payloadSource =
                                (parsed as { payload?: unknown }).payload ??
                                (parsed as { data?: unknown }).data;

                        let payload: RealtimeEvent["payload"];
                        try {
                                payload = validateRealtimeEvent(type, payloadSource);
                        } catch (error) {
                                console.error("[Realtime] Received invalid event payload", error);
                                return;
                        }

                        const timestamp =
                                typeof (parsed as { timestamp?: unknown }).timestamp === "number"
                                        ? (parsed as { timestamp: number }).timestamp
                                        : Date.now();

                        const organizationId =
                                typeof (parsed as { organizationId?: unknown }).organizationId ===
                                "string"
                                        ? (parsed as { organizationId: string }).organizationId
                                        : null;

                        const websiteId =
                                typeof (parsed as { websiteId?: unknown }).websiteId === "string"
                                        ? (parsed as { websiteId: string }).websiteId
                                        : null;

                        if (!(organizationId && websiteId)) {
                                console.error(
                                        "[Realtime] Received event without routing metadata",
                                        parsed
                                );
                                return;
                        }

                        const visitorIdRaw = (parsed as { visitorId?: unknown }).visitorId;
                        const visitorId =
                                typeof visitorIdRaw === "string" && visitorIdRaw.length > 0
                                        ? visitorIdRaw
                                        : null;

                        const event: RealtimeEvent = {
                                type,
                                payload,
                                timestamp,
                                organizationId,
                                websiteId,
                                visitorId,
                        };

                        lastHeartbeatRef.current = Date.now();
                        setLastEvent(event);

                        for (const handler of eventHandlersRef.current) {
                                handler(event);
                        }

                        return;
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

                        const now = Date.now();
                        const elapsed = now - lastHeartbeatRef.current;

                        if (elapsed > heartbeatTimeoutMs) {
                                const socket = getWebSocket();
                                socket?.close(4000, "Heartbeat timeout");
                                return;
                        }

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
                (event: RealtimeEvent) => {
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

        const subscribe = useCallback((handler: SubscribeHandler) => {
                eventHandlersRef.current.add(handler);
                return () => {
                        eventHandlersRef.current.delete(handler);
                };
        }, []);

        const connection = useMemo<RealtimeConnectionState>(
                () => ({
                        isConnected: readyState === ReadyState.OPEN,
                        isConnecting: readyState === ReadyState.CONNECTING,
                        error: connectionError,
                        send,
                        subscribe,
                        lastEvent,
                        connectionId,
                        reconnect,
                }),
                [
                        readyState,
                        connectionError,
                        send,
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
                [connection, normalizedAuth?.visitorId, normalizedAuth?.websiteId, normalizedAuth?.userId]
        );

        return (
                <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
        );
}

export function useRealtimeConnection(): RealtimeContextValue {
        const context = useContext(RealtimeContext);
        if (!context) {
                throw new Error("useRealtimeConnection must be used within RealtimeProvider");
        }

        return context;
}

export type { RealtimeContextValue };
export type { RealtimeAuthConfig };
export type { RealtimeProviderProps };
export type { RealtimeEvent };
