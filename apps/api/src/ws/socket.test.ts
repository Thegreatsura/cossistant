import { beforeEach, describe, expect, it } from "bun:test";
import type { RawSocket } from "./socket";

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
                } as unknown as RawSocket;

                const otherSocket = {
                        send: (message: string) => {
                                otherMessages.push(message);
                        },
                } as unknown as RawSocket;

                const noWebsiteSocket = {
                        send: (message: string) => {
                                unscopedMessages.push(message);
                        },
                } as unknown as RawSocket;

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
