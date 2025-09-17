import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@api/db", () => ({ db: {} }));
mock.module("@api/db/queries/api-keys", () => ({}));
mock.module("@api/db/schema", () => ({ website: {} }));
mock.module("@api/lib/auth", () => ({ auth: {} }));
mock.module("drizzle-orm", () => ({
        eq: () => ({}),
}));
mock.module("hono/bun", () => ({
        createBunWebSocket: () => ({
                websocket: {},
                upgradeWebSocket: () => ({}),
        }),
}));
mock.module("@api/lib/auth-validation", () => ({
        AuthValidationError: class extends Error {
                statusCode = 401;
        },
        performAuthentication: async () => {
                throw new Error("not implemented");
        },
}));
mock.module("@api/utils/websocket-connection", () => ({
        createConnectionEvent: () => ({
                type: "USER_CONNECTED",
                data: { userId: "user", connectionId: "conn", timestamp: Date.now() },
                timestamp: Date.now(),
        }),
        createConnectionInfo: async () => ({
                connectionId: "conn",
                serverId: "server",
                connectedAt: Date.now(),
                lastHeartbeat: Date.now(),
        }),
        getConnectionIdFromSocket: () => undefined,
        handleAuthenticationFailure: async () => {},
        handleIdentificationFailure: async () => {},
        sendConnectionEstablishedMessage: () => {},
        sendError: () => {},
        storeConnectionId: () => {},
        updatePresenceIfNeeded: async () => {},
}));
mock.module("@api/utils/websocket-updates", () => ({
        updateLastSeenTimestamps: async () => {},
}));
mock.module("@api/lib/pubsub", () => ({
        pubsub: {
                registerConnection: async () => {},
                unregisterConnection: async () => {},
                subscribeToChannels: async () => ({ unsubscribe: async () => {} }),
                updatePresence: async () => {},
                getServerId: () => "server",
                getWebsiteConnections: async () => [],
                isLocalConnection: async () => true,
                getConnectionInfo: async () => null,
        },
        emitToDashboard: async () => {},
}));
mock.module("@cossistant/types/realtime-events", () => ({
        isValidEventType: () => true,
        validateRealtimeEvent: (_type: string, data: unknown) => data,
}));

type TestRawSocket = { send: (message: string) => void };

process.env.RESEND_API_KEY = "test_resend_api_key";

const socketModulePromise = import("./socket");

describe("broadcastToWebsite", () => {
        beforeEach(async () => {
                const { localConnections } = await socketModulePromise;
                localConnections.clear();
        });

        it("sends events only to sockets matching the website channel", async () => {
                const { broadcastToWebsite, localConnections } = await socketModulePromise;

                const matchingMessages: string[] = [];
                const otherMessages: string[] = [];
                const unscopedMessages: string[] = [];

                const matchingSocket = {
                        send: (message: string) => {
                                matchingMessages.push(message);
                        },
                } as unknown as TestRawSocket;

                const otherSocket = {
                        send: (message: string) => {
                                otherMessages.push(message);
                        },
                } as unknown as TestRawSocket;

                const noWebsiteSocket = {
                        send: (message: string) => {
                                unscopedMessages.push(message);
                        },
                } as unknown as TestRawSocket;

                localConnections.set("conn-1", {
                        socket: matchingSocket,
                        websiteId: "website-1",
                });

                localConnections.set("conn-2", {
                        socket: otherSocket,
                        websiteId: "website-2",
                });

                localConnections.set("conn-3", {
                        socket: noWebsiteSocket,
                });

                const payload = { type: "TEST_EVENT" };

                broadcastToWebsite("website-1", payload);

                expect(matchingMessages).toEqual([JSON.stringify(payload)]);
                expect(otherMessages).toEqual([]);
                expect(unscopedMessages).toEqual([]);
        });
});
