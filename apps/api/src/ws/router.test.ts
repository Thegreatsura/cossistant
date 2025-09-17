import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";

const emitToDashboard = mock(async () => {});

mock.module("@api/lib/pubsub", () => ({
        emitToDashboard,
        pubsub: {
                publish: async () => {},
        },
}));

const routerModulePromise = import("./router");

describe("routeEvent", () => {
        beforeEach(() => {
                emitToDashboard.mockReset();
        });

        it("emits USER_PRESENCE_UPDATE to the dashboard when a visitor triggers it", async () => {
                const { routeEvent } = await routerModulePromise;

                const event: RealtimeEvent<"USER_PRESENCE_UPDATE"> = {
                        type: "USER_PRESENCE_UPDATE",
                        data: {
                                userId: "user-123",
                                status: "online",
                                lastSeen: Date.now(),
                        },
                        timestamp: Date.now(),
                };

                await routeEvent(event, {
                        connectionId: "conn-123",
                        visitorId: "visitor-456",
                        websiteId: "website-789",
                        organizationId: "org-000",
                });

                expect(emitToDashboard).toHaveBeenCalledTimes(1);
                expect(emitToDashboard).toHaveBeenCalledWith(
                        "website-789",
                        "USER_PRESENCE_UPDATE",
                        event.data,
                );
        });
});
