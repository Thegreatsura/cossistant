import { db } from "@api/db";
import type { ApiKeyWithWebsiteAndOrganization } from "@api/db/queries/api-keys";
import { normalizeSessionToken, resolveSession } from "@api/db/queries/session";

import { website as websiteTable } from "@api/db/schema";
import {
	AuthValidationError,
	type AuthValidationOptions,
	performAuthentication,
} from "@api/lib/auth-validation";
import {
	type ConnectionInfo,
	pubsub,
	type Subscription,
} from "@api/lib/pubsub";
import {
	createConnectionEvent,
	createConnectionInfo,
	getConnectionIdFromSocket,
	handleAuthenticationFailure,
	handleIdentificationFailure,
	sendConnectionEstablishedMessage,
	sendError,
	storeConnectionId,
	updatePresenceIfNeeded,
} from "@api/utils/websocket-connection";
import { updateLastSeenTimestamps } from "@api/utils/websocket-updates";
import {
	isValidEventType,
	type RealtimeEvent,
	validateRealtimeEvent,
} from "@cossistant/types/realtime-events";
import type { ServerWebSocket } from "bun";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { createBunWebSocket } from "hono/bun";
import { type EventContext, routeEvent } from "./router";

export type ConnectionData = {
	connectionId: string;
	userId?: string;
	connectedAt: number;
	apiKey?: ApiKeyWithWebsiteAndOrganization;
	organizationId?: string;
	websiteId?: string;
};

// Local WebSocket connection tracking (only for this server instance)
export type RawSocket = ServerWebSocket & { connectionId?: string };

export type LocalConnectionRecord = {
        socket: RawSocket;
        websiteId?: string;
        organizationId?: string;
        userId?: string;
        visitorId?: string;
};

export const localConnections = new Map<string, LocalConnectionRecord>();
// Active subscriptions for this server instance
const activeSubscriptions = new Map<string, Subscription>();

// Enable auth logging by setting ENABLE_AUTH_LOGS=true
const AUTH_LOGS_ENABLED = process.env.ENABLE_AUTH_LOGS === "true";

/**
 * Generates a unique connection ID
 */
export function generateConnectionId(): string {
	return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Handles WebSocket connection lifecycle
 */
export const { websocket, upgradeWebSocket } =
	createBunWebSocket<ServerWebSocket>();

/**
 * Get all active connections for a website (from Redis)
 */
export async function getWebsiteConnections(
	websiteId: string,
): Promise<ConnectionInfo[]> {
	return await pubsub.getWebsiteConnections(websiteId);
}

/**
 * Check if a connection is local to this server
 */
export async function isLocalConnection(
	connectionId: string,
): Promise<boolean> {
	return await pubsub.isLocalConnection(connectionId);
}

/**
 * Broadcast event to all local connections for a website
 */
export function broadcastToWebsite(websiteId: string, event: unknown): void {
        for (const [, connection] of localConnections) {
                if (connection.websiteId !== websiteId) {
                        continue;
                }

                try {
                        connection.socket.send(JSON.stringify(event));
                } catch {
                        // Ignore send errors
                }
        }
}

/**
 * Send event to a specific connection
 */
function sendToConnection(connectionId: string, event: unknown): void {
        const connection = localConnections.get(connectionId);
        if (connection) {
                try {
                        connection.socket.send(JSON.stringify(event));
                } catch {
                        // Ignore send errors
                }
        }
}

/**
 * Ensure we have subscriptions for the given connection context
 */
async function ensureSubscriptions(
	connectionId: string,
	websiteId?: string,
): Promise<void> {
	// Create subscription key based on context
	const subscriptionKey = websiteId
		? `website:${websiteId}`
		: `connection:${connectionId}`;

	// Don't create duplicate subscriptions
	if (activeSubscriptions.has(subscriptionKey)) {
		return;
	}

	// Subscribe to events and broadcast to local WebSocket connections
        const subscription = await pubsub.subscribeToChannels(
                {
                        websiteId,
                        connectionId: websiteId ? undefined : connectionId,
                },
                async (event) => {
                        if (websiteId) {
                                broadcastToWebsite(websiteId, event);
                        } else {
                                sendToConnection(connectionId, event);
                        }
                },
        );

	activeSubscriptions.set(subscriptionKey, subscription);
	console.log(`[WebSocket] Created subscription: ${subscriptionKey}`);
}

async function cleanupConnection(connectionId: string): Promise<void> {
        // Remove from local connections
        localConnections.delete(connectionId);

	// Unregister from Redis
	await pubsub.unregisterConnection(connectionId);

	// Clean up any connection-specific subscriptions
	const connSubscription = activeSubscriptions.get(
		`connection:${connectionId}`,
	);
	if (connSubscription) {
		await connSubscription.unsubscribe();
		activeSubscriptions.delete(`connection:${connectionId}`);
	}

	console.log(`[WebSocket] Cleaned up connection: ${connectionId}`);
}

/**
 * Extract authentication credentials from WebSocket context
 */
function extractAuthCredentials(c: Context): {
        privateKey: string | undefined;
        publicKey: string | undefined;
        actualOrigin: string | undefined;
        visitorId: string | undefined;
} {
	// Try headers first (for non-browser clients)
	const authHeader = c.req.header("Authorization");
	let privateKey = authHeader?.split(" ")[1];
	let publicKey = c.req.header("X-Public-Key");
	let visitorId = c.req.header("X-Visitor-Id");

	// Fallback to URL parameters (for browser WebSocket clients)
	// This is necessary because browsers can't set custom headers on WebSocket connections
	if (!privateKey) {
		privateKey = c.req.query("token");
	}
	if (!publicKey) {
		publicKey = c.req.query("publicKey");
	}
	if (!visitorId) {
		visitorId = c.req.query("visitorId");
	}

	// Extract origin from WebSocket-specific headers
	// Priority: Origin > Sec-WebSocket-Origin > Referer
	const origin = c.req.header("Origin");
	const secWebSocketOrigin = c.req.header("Sec-WebSocket-Origin");
	const referer = c.req.header("Referer");

	let actualOrigin = origin || secWebSocketOrigin;

	// If no origin headers, try to extract from referer
	if (!actualOrigin && referer) {
		try {
			const refererUrl = new URL(referer);
			actualOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
		} catch {
			// Invalid referer URL, ignore
		}
	}

	if (AUTH_LOGS_ENABLED) {
		console.log("[WebSocket Auth] Extracted credentials:", {
			hasPrivateKey: !!privateKey,
			hasPublicKey: !!publicKey,
			publicKey: publicKey ? `${publicKey.substring(0, 10)}...` : null,
			origin,
			secWebSocketOrigin,
			referer,
			actualOrigin,
			visitorId: visitorId ? `${visitorId.substring(0, 8)}...` : null,
		});
	}

        return { privateKey, publicKey, actualOrigin, visitorId };
}

function extractSessionToken(c: Context): string | undefined {
        const queryCandidates = [
                c.req.query("sessionToken"),
                c.req.query("sessionId"),
                c.req.query("session"),
        ];

        for (const candidate of queryCandidates) {
                const normalized = normalizeSessionToken(candidate);
                if (normalized) {
                        return normalized;
                }
        }

        const headerToken = normalizeSessionToken(
                c.req.header("x-user-session-token"),
        );

        return headerToken;
}

/**
 * Parse protocol and hostname from origin
 */
function parseOriginDetails(actualOrigin: string | undefined): {
	protocol: string | undefined;
	hostname: string | undefined;
} {
	if (!actualOrigin) {
		return { protocol: undefined, hostname: undefined };
	}

	try {
		const url = new URL(actualOrigin);
		// Convert HTTP protocols to WebSocket protocols for validation
		const protocol =
			url.protocol === "https:"
				? "wss:"
				: url.protocol === "http:"
					? "ws:"
					: url.protocol;
		return { protocol, hostname: url.hostname };
	} catch (error) {
		if (AUTH_LOGS_ENABLED) {
			console.log("[WebSocket Auth] Failed to parse origin:", error);
		}
		return { protocol: undefined, hostname: undefined };
	}
}

/**
 * Extract protocol and hostname from request if not available from origin
 */
function extractFromRequest(c: Context): {
	protocol: string | undefined;
	hostname: string | undefined;
} {
	const hostHeader = c.req.header("Host");
	if (!hostHeader) {
		return { protocol: undefined, hostname: undefined };
	}

	const hostname = hostHeader.split(":")[0];
	const isSecure = c.req.url.startsWith("wss://");
	const protocol = isSecure ? "wss:" : "ws:";

	return { protocol, hostname };
}

/**
 * Extract protocol and hostname from WebSocket context
 */
function extractProtocolAndHostname(
	c: Context,
	actualOrigin: string | undefined,
): { protocol: string | undefined; hostname: string | undefined } {
	if (actualOrigin) {
		return parseOriginDetails(actualOrigin);
	}

	// Fallback to extracting from the WebSocket request URL
	const requestDetails = extractFromRequest(c);

	if (AUTH_LOGS_ENABLED && requestDetails.hostname) {
		console.log("[WebSocket Auth] No origin header, using request details:", {
			protocol: requestDetails.protocol,
			hostname: requestDetails.hostname,
			url: c.req.url,
		});
	}

	return requestDetails;
}

/**
 * Log authentication attempt if logging is enabled
 */
function logAuthAttempt(
        hasPrivateKey: boolean,
        hasPublicKey: boolean,
        hasSessionToken: boolean,
        actualOrigin: string | undefined,
        url: string,
): void {
        if (AUTH_LOGS_ENABLED) {
                console.log("[WebSocket Auth] Authentication attempt:", {
                        hasPrivateKey,
                        hasPublicKey,
                        hasSessionToken,
                        origin: actualOrigin,
                        url,
                });
        }
}

/**
 * Log authentication success if logging is enabled
 */
function logAuthSuccess(result: WebSocketAuthSuccess): void {
	if (AUTH_LOGS_ENABLED) {
		console.log("[WebSocket Auth] Authentication successful:", {
			hasApiKey: !!result.apiKey,
			apiKeyId: result.apiKey?.id,
			organizationId: result.organizationId,
			websiteId: result.websiteId,
			userId: result.userId,
			visitorId: result.visitorId
				? `${result.visitorId.substring(0, 8)}...`
				: null,
			isTestKey: result.isTestKey,
		});
	}
}

/**
 * Result of a successful WebSocket authentication
 */
export type WebSocketAuthSuccess = {
	organizationId?: string;
	websiteId?: string;
	userId?: string;
	visitorId?: string;
	apiKey?: ApiKeyWithWebsiteAndOrganization;
	isTestKey?: boolean;
};

/**
 * Perform WebSocket authentication with API key
 */
async function performApiKeyAuthentication(
	privateKey: string | undefined,
	publicKey: string | undefined,
	options: AuthValidationOptions,
): Promise<WebSocketAuthSuccess | null> {
	try {
		const result = await authenticateWithApiKey(privateKey, publicKey, options);
		return result;
	} catch (error) {
		if (error instanceof AuthValidationError) {
			if (AUTH_LOGS_ENABLED) {
				console.log("[WebSocket Auth] API key authentication failed:", {
					error: error.message,
					statusCode: error.statusCode,
				});
			}
			throw error;
		}
		throw error;
	}
}

/**
 * Authenticate WebSocket connection
 * Accept either API keys (public/private) or a Better Auth session via cookies
 */
async function authenticateWebSocketConnection(
	c: Context,
): Promise<WebSocketAuthSuccess | null> {
	try {
		// Extract credentials
                const { privateKey, publicKey, actualOrigin, visitorId } =
                        extractAuthCredentials(c);
                const sessionToken = extractSessionToken(c);

                logAuthAttempt(
                        !!privateKey,
                        !!publicKey,
                        !!sessionToken,
                        actualOrigin,
                        c.req.url,
                );

		// Extract protocol and hostname
		const { protocol, hostname } = extractProtocolAndHostname(c, actualOrigin);

		// Build validation options
		const options: AuthValidationOptions = {
			origin: actualOrigin,
			protocol,
			hostname,
		};

		// Authenticate with API key or session
		let result: WebSocketAuthSuccess | null = null;

		if (privateKey || publicKey) {
			result = await performApiKeyAuthentication(
				privateKey,
				publicKey,
				options,
			);
                } else {
                        result = await authenticateWithSession(c, sessionToken);

                        if (!result && AUTH_LOGS_ENABLED) {
                                console.log("[WebSocket Auth] No valid authentication method provided");
                        }
                }

		// Add visitorId to the result if authentication was successful
		if (result) {
			result.visitorId = visitorId;
			logAuthSuccess(result);
		}

		return result;
	} catch (error) {
		if (AUTH_LOGS_ENABLED) {
			console.error("[WebSocket Auth] Authentication failed:", error);
		}

		if (error instanceof AuthValidationError) {
			throw error;
		}

		// For any other errors, wrap them
		throw new AuthValidationError(500, "Internal authentication error");
	}
}

async function authenticateWithApiKey(
	privateKey: string | undefined,
	publicKey: string | undefined,
	options: AuthValidationOptions,
): Promise<WebSocketAuthSuccess> {
	const result = await performAuthentication(
		privateKey,
		publicKey,
		db,
		options,
	);

	const authSuccess: WebSocketAuthSuccess = {
		apiKey: result.apiKey,
		isTestKey: result.isTestKey,
		organizationId: result.apiKey.organization.id,
		websiteId: result.apiKey.website?.id,
	};

	return authSuccess;
}

async function authenticateWithSession(
        c: Context,
        sessionToken: string | undefined,
): Promise<WebSocketAuthSuccess | null> {
        const session = await resolveSession(db, {
                headers: c.req.raw.headers,
                sessionToken,
        });
        if (!session) {
                if (AUTH_LOGS_ENABLED) {
                        console.log(
                                sessionToken
                                        ? "[WebSocket Auth] Session token invalid or expired"
                                        : "[WebSocket Auth] No API key or session provided",
                        );
                }
                return null;
        }

	const organizationId = session.session.activeOrganizationId ?? null;
	const activeTeamId = session.session.activeTeamId ?? null;
	let websiteId: string | undefined;

	if (activeTeamId) {
		const [site] = await db
			.select({ id: websiteTable.id })
			.from(websiteTable)
			.where(eq(websiteTable.teamId, activeTeamId))
			.limit(1);
		websiteId = site?.id;
	}

	if (!organizationId && AUTH_LOGS_ENABLED) {
		console.log(
			"[WebSocket Auth] Session found but no active organization; proceeding without website context",
		);
	}

	return {
		organizationId: organizationId ?? undefined,
		websiteId,
		userId: session.user.id,
	};
}

export const upgradedWebsocket = upgradeWebSocket(async (c) => {
	let authResult: WebSocketAuthSuccess | null = null;
	let authError: AuthValidationError | null = null;

	try {
		// Perform authentication during the upgrade phase
		authResult = await authenticateWebSocketConnection(c);
	} catch (error) {
		if (error instanceof AuthValidationError) {
			authError = error;
		} else {
			// Log unexpected errors but don't expose them to the client
			console.error("[WebSocket] Unexpected authentication error:", error);
			authError = new AuthValidationError(500, "Authentication failed");
		}
	}

	return {
		async onOpen(evt, ws) {
			const connectionId = generateConnectionId();

			// If we have an authentication error, send it and close the connection
			if (authError) {
				sendError(ws, {
					error: "Authentication failed",
					message: authError.message,
					code: authError.statusCode,
				});
				ws.close(authError.statusCode === 403 ? 1008 : 1011, authError.message);
				return;
			}

			// Check if authentication was successful
			if (!authResult) {
				await handleAuthenticationFailure(ws, connectionId);
				return;
			}

			// Check if we have either a user ID or visitor ID
			if (!(authResult.userId || authResult.visitorId)) {
				await handleIdentificationFailure(ws, connectionId);
				return;
			}

			// Register connection in Redis for horizontal scaling
			const connectionInfo = await createConnectionInfo(
				connectionId,
				authResult,
			);
			await pubsub.registerConnection(connectionInfo);

			// Track socket locally for this server instance
                        localConnections.set(connectionId, {
                                socket: ws.raw as RawSocket,
                                websiteId: authResult.websiteId,
                                organizationId: authResult.organizationId,
                                userId: authResult.userId,
                                visitorId: authResult.visitorId,
                        });
			storeConnectionId(ws, connectionId);

			console.log(
				`[WebSocket] Connection opened: ${connectionId} for organization: ${authResult.organizationId}`,
			);

			// Send successful connection message
			sendConnectionEstablishedMessage(ws, connectionId, authResult);

			// Emit USER_CONNECTED or VISITOR_CONNECTED event based on authentication type
			try {
				const event = createConnectionEvent(authResult, connectionId);
				const context: EventContext = {
					connectionId,
					userId: authResult.userId,
					visitorId: authResult.visitorId,
					websiteId: authResult.websiteId,
					organizationId: authResult.organizationId,
					ws: undefined,
				};
				routeEvent(event, context);
			} catch (error) {
				console.error("[WebSocket] Error creating connection event:", error);
				// Continue with connection setup even if event creation fails
			}

			// Set up subscriptions for this connection
			await ensureSubscriptions(connectionId, authResult.websiteId);

			// Update presence to online for authenticated users or visitors
			await updatePresenceIfNeeded(authResult);

			// Update last seen timestamps
			await updateLastSeenTimestamps({ db, authResult });
		},

                async onMessage(evt, ws) {
                        // Get connectionId from the WebSocket
                        const connectionId = getConnectionIdFromSocket(ws);
                        const connection = connectionId
                                ? localConnections.get(connectionId)
                                : undefined;

                        if (!(connectionId && connection)) {
                                console.error("[WebSocket] No connection found");
                                sendError(ws, {
                                        error: "Connection not authenticated",
                                        message: "Please reconnect with valid authentication.",
                                });
                                return;
                        }

                        try {
                                const message = JSON.parse(evt.data.toString());

				if (!(message.type && isValidEventType(message.type))) {
					console.error(`[WebSocket] Invalid event type: ${message.type}`);
					sendError(ws, {
						error: "Invalid event type",
						message: `Invalid event type: ${message.type}`,
					});
					return;
				}

				// Validate event data
				const validatedData = validateRealtimeEvent(message.type, message.data);

                                const event: RealtimeEvent = {
                                        type: message.type,
                                        data: validatedData,
                                        timestamp: Date.now(),
                                };

                                // Gather connection metadata from local cache, falling back to Redis
                                let { userId, visitorId, websiteId, organizationId } = connection;

                                if (
                                        (!userId && !visitorId) ||
                                        !websiteId ||
                                        !organizationId
                                ) {
                                        const connectionInfo = await pubsub.getConnectionInfo(
                                                connectionId,
                                        );

                                        if (connectionInfo) {
                                                userId ??= connectionInfo.userId;
                                                visitorId ??= connectionInfo.visitorId;
                                                websiteId ??= connectionInfo.websiteId;
                                                organizationId ??= connectionInfo.organizationId;

                                                localConnections.set(connectionId, {
                                                        ...connection,
                                                        userId,
                                                        visitorId,
                                                        websiteId,
                                                        organizationId,
                                                });
                                        }
                                }

                                if (
                                        (!userId && !visitorId) ||
                                        !websiteId ||
                                        !organizationId
                                ) {
                                        console.error(
                                                `[WebSocket] Missing connection metadata for ${connectionId}`,
                                        );
                                        sendError(ws, {
                                                error: "Connection context unavailable",
                                                message:
                                                        "Unable to determine connection context. Please reconnect.",
                                        });
                                        return;
                                }

                                const context: EventContext = {
                                        connectionId,
                                        userId,
                                        visitorId,
                                        websiteId,
                                        organizationId,
                                        ws: undefined,
                                };

                                await routeEvent(event, context);
                        } catch (error) {
                                console.error("[WebSocket] Error processing message:", error);
                                ws.send(
                                        JSON.stringify({
                                                error: "Invalid message format",
						details: error instanceof Error ? error.message : "Unknown error",
					}),
				);
			}
		},

		async onClose(evt, ws) {
			// Get connectionId from the WebSocket
			const connectionId = ws.raw
				? (ws.raw as ServerWebSocket & { connectionId?: string }).connectionId
				: undefined;

			if (!connectionId) {
				console.error("[WebSocket] No connection ID found on close");
				return;
			}

			console.log(`[WebSocket] Connection closed: ${connectionId}`);

			// TODO: Emit USER_DISCONNECTED event
			// We'd need to fetch user info from Redis first

			// Clean up connection
			await cleanupConnection(connectionId);
		},

		onError(evt, ws) {
			// Get connectionId from the WebSocket
			const connectionId = ws.raw
				? (ws.raw as ServerWebSocket & { connectionId?: string }).connectionId
				: undefined;

			console.error(`[WebSocket] Error on connection ${connectionId}:`, evt);
		},
	};
});
