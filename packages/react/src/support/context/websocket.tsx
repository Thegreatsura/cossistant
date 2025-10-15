"use client";

import type React from "react";
import { createContext, useContext, useEffect, useMemo } from "react";
import { PRESENCE_PING_INTERVAL_MS } from "@cossistant/types";
import {
	type RealtimeAuthConfig,
	type RealtimeContextValue,
	RealtimeProvider,
	useRealtimeConnection,
} from "../../realtime";

type WebSocketContextValue = RealtimeContextValue;

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

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

function createVisitorAuthConfig({
	visitorId,
	websiteId,
	publicKey,
}: Pick<
	WebSocketProviderProps,
	"visitorId" | "websiteId" | "publicKey"
>): RealtimeAuthConfig | null {
	const normalizedVisitorId = visitorId?.trim();
	if (!normalizedVisitorId) {
		return null;
	}

	return {
		kind: "visitor",
		visitorId: normalizedVisitorId,
		websiteId: websiteId?.trim() || null,
		publicKey: publicKey?.trim() || null,
	} satisfies RealtimeAuthConfig;
}

type WebSocketBridgeProps = {
	children: React.ReactNode;
};

const WebSocketBridge: React.FC<WebSocketBridgeProps> = ({ children }) => {
        const connection = useRealtimeConnection();
        const { visitorId, sendRaw, isConnected } = connection;

        useEffect(() => {
                if (typeof window === "undefined") {
                        return;
                }

                if (!visitorId || !sendRaw) {
                        return;
                }

                const pingMessage = "presence:ping";

                const sendPresencePing = () => {
                        if (!isConnected) {
                                return;
                        }

                        try {
                                sendRaw(pingMessage);
                        } catch (error) {
                                console.error("[Support] Failed to send presence ping", error);
                        }
                };

                const handleFocus = () => {
                        sendPresencePing();
                };

                window.addEventListener("focus", handleFocus);

                if (isConnected) {
                        sendPresencePing();
                }

                const intervalId = window.setInterval(
                        sendPresencePing,
                        PRESENCE_PING_INTERVAL_MS
                );

                return () => {
                        window.removeEventListener("focus", handleFocus);
                        window.clearInterval(intervalId);
                };
        }, [isConnected, sendRaw, visitorId]);
        const value = useMemo(() => connection, [connection]);
        return (
                <WebSocketContext.Provider value={value}>
                        {children}
                </WebSocketContext.Provider>
	);
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
	children,
	publicKey,
	websiteId,
	visitorId,
	wsUrl,
	autoConnect = true,
	onConnect,
	onDisconnect,
	onError,
}) => {
	const auth = createVisitorAuthConfig({ publicKey, websiteId, visitorId });

	return (
		<RealtimeProvider
			auth={auth}
			autoConnect={autoConnect}
			onConnect={onConnect}
			onDisconnect={onDisconnect}
			onError={onError}
			wsUrl={wsUrl}
		>
			<WebSocketBridge>{children}</WebSocketBridge>
		</RealtimeProvider>
	);
};

export const useWebSocket = (): WebSocketContextValue => {
	const context = useContext(WebSocketContext);
	if (!context) {
		throw new Error("useWebSocket must be used within WebSocketProvider");
	}
	return context;
};

export type { WebSocketContextValue, WebSocketProviderProps };
export type { RealtimeEvent } from "@cossistant/types/realtime-events";
