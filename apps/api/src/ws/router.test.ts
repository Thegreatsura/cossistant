import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";

const emitToDashboard = mock(async () => {});
const emitToAll = mock(async () => {});

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
      event.data
    );
  });

  it("emits VISITOR_CONNECTED to the dashboard when a visitor joins", async () => {
    const { routeEvent } = await routerModulePromise;

    const event: RealtimeEvent<"VISITOR_CONNECTED"> = {
      type: "VISITOR_CONNECTED",
      data: {
        visitorId: "visitor-123",
        connectionId: "conn-456",
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    await routeEvent(event, {
      connectionId: "conn-456",
      visitorId: "visitor-123",
      websiteId: "website-abc",
      organizationId: "org-xyz",
    });

    expect(emitToDashboard).toHaveBeenCalledTimes(1);
    expect(emitToDashboard).toHaveBeenCalledWith(
      "website-abc",
      "VISITOR_CONNECTED",
      event.data
    );
  });
});

describe("MESSAGE_CREATED handler", () => {
  it("forwards message events to all relevant channels", async () => {
    const { routeEvent } = await routerModulePromise;

    const event: RealtimeEvent<"MESSAGE_CREATED"> = {
      type: "MESSAGE_CREATED",
      data: {
        message: {
          id: "msg-1",
          bodyMd: "hello",
          type: "text",
          userId: "user-1",
          aiAgentId: null,
          visitorId: null,
          organizationId: "org-1",
          websiteId: "site-1",
          conversationId: "conv-1",
          parentMessageId: null,
          modelUsed: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          visibility: "public",
        },
        conversationId: "conv-1",
        websiteId: "site-1",
        organizationId: "org-1",
      },
      timestamp: Date.now(),
    };

    await routeEvent(event, {
      connectionId: "conn-1",
      websiteId: "site-1",
      organizationId: "org-1",
    });

    expect(emitToAll).toHaveBeenCalledTimes(1);
    expect(emitToAll).toHaveBeenCalledWith(
      "conv-1",
      "site-1",
      "MESSAGE_CREATED",
      event.data
    );
  });
});
