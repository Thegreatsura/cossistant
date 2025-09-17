import { beforeEach, describe, expect, it, mock } from "bun:test";

const routeEventCalls: unknown[][] = [];
const updatePresenceCalls: unknown[][] = [];
const unregisterConnectionCalls: string[] = [];
const getConnectionInfoCalls: string[] = [];
let connectionInfoResponse: unknown = null;

mock.module("@api/db", () => ({ db: {} }));
mock.module("@api/db/queries/api-keys", () => ({}));
mock.module("@api/db/queries/session", () => ({
        normalizeSessionToken: (token: string | null | undefined) =>
                token?.trim() || undefined,
        resolveSession: async () => null,
}));
mock.module("@api/db/schema", () => ({ website: {} }));
mock.module("@api/lib/auth", () => ({
        auth: {
                api: {
                        getSession: async () => null,
                },
        },
}));
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
mock.module("./router", () => ({
        routeEvent: async (...args: unknown[]) => {
                routeEventCalls.push(args);
        },
}));

mock.module("@api/lib/pubsub", () => ({
        pubsub: {
                registerConnection: async () => {},
                unregisterConnection: async (connectionId: string) => {
                        unregisterConnectionCalls.push(connectionId);
                },
                subscribeToChannels: async () => ({ unsubscribe: async () => {} }),
                updatePresence: async (...args: unknown[]) => {
                        updatePresenceCalls.push(args);
                },
                getServerId: () => "server",
                getWebsiteConnections: async () => [],
                isLocalConnection: async () => true,
                getConnectionInfo: async (connectionId: string) => {
                        getConnectionInfoCalls.push(connectionId);
                        return connectionInfoResponse;
                },
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

beforeEach(() => {
        routeEventCalls.length = 0;
        updatePresenceCalls.length = 0;
        unregisterConnectionCalls.length = 0;
        getConnectionInfoCalls.length = 0;
        connectionInfoResponse = null;
});

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

describe("handleConnectionClose", () => {
        beforeEach(async () => {
                const { localConnections } = await socketModulePromise;
                localConnections.clear();
        });

        it("publishes user disconnect and offline presence once", async () => {
                const { handleConnectionClose, localConnections } = await socketModulePromise;

                localConnections.set("conn-user", {
                        socket: {} as unknown as TestRawSocket,
                        userId: "user-1",
                        websiteId: "website-1",
                        organizationId: "org-1",
                });

                await handleConnectionClose("conn-user");

                expect(routeEventCalls).toHaveLength(1);
                const [event, context] = routeEventCalls[0] as [
                        { type: string; data: Record<string, unknown> },
                        Record<string, unknown>,
                ];
                expect(event).toMatchObject({
                        type: "USER_DISCONNECTED",
                        data: {
                                userId: "user-1",
                                connectionId: "conn-user",
                        },
                });
                expect(typeof event.data.timestamp).toBe("number");
                expect(context).toMatchObject({
                        connectionId: "conn-user",
                        userId: "user-1",
                        websiteId: "website-1",
                        organizationId: "org-1",
                });

                expect(updatePresenceCalls).toEqual([["user-1", "offline", "website-1"]]);
                expect(unregisterConnectionCalls).toEqual(["conn-user"]);
                expect(getConnectionInfoCalls).toEqual([]);

                expect(localConnections.has("conn-user")).toBe(false);
        });

        it("fetches metadata from Redis when local context is incomplete", async () => {
                const { handleConnectionClose, localConnections } = await socketModulePromise;

                localConnections.set("conn-visitor", {
                        socket: {} as unknown as TestRawSocket,
                });

                connectionInfoResponse = {
                        connectionId: "conn-visitor",
                        serverId: "server",
                        visitorId: "visitor-1",
                        websiteId: "website-9",
                        organizationId: "org-9",
                        connectedAt: Date.now(),
                        lastHeartbeat: Date.now(),
                };

                await handleConnectionClose("conn-visitor");

                expect(routeEventCalls).toHaveLength(1);
                const [event, context] = routeEventCalls[0] as [
                        { type: string; data: Record<string, unknown> },
                        Record<string, unknown>,
                ];
                expect(event).toMatchObject({
                        type: "VISITOR_DISCONNECTED",
                        data: {
                                visitorId: "visitor-1",
                                connectionId: "conn-visitor",
                        },
                });
                expect(typeof event.data.timestamp).toBe("number");
                expect(context).toMatchObject({
                        connectionId: "conn-visitor",
                        visitorId: "visitor-1",
                        websiteId: "website-9",
                        organizationId: "org-9",
                });

                expect(updatePresenceCalls).toEqual([["visitor-1", "offline", "website-9"]]);
                expect(unregisterConnectionCalls).toEqual(["conn-visitor"]);
                expect(getConnectionInfoCalls).toEqual(["conn-visitor"]);

                expect(localConnections.has("conn-visitor")).toBe(false);
        });
});
