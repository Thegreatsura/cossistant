import { db } from "@api/db";
import type { ApiKeyWithWebsiteAndOrganization } from "@api/db/queries/api-keys";
import { updateUserLastSeen } from "@api/db/queries/user";
import { upsertVisitor } from "@api/db/queries/visitor";
import { website as websiteTable } from "@api/db/schema";
import { auth } from "@api/lib/auth";
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
type RawSocket = ServerWebSocket & { connectionId?: string };
const localConnections = new Map<string, RawSocket>();
// Active subscriptions for this server instance
const activeSubscriptions = new Map<string, Subscription>();

// Enable auth logging by setting ENABLE_AUTH_LOGS=true
const AUTH_LOGS_ENABLED = process.env.ENABLE_AUTH_LOGS === "true";

/**
 * Generates a unique connection ID
 */
function generateConnectionId(): string {
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
	websiteId: string
): Promise<ConnectionInfo[]> {
	return await pubsub.getWebsiteConnections(websiteId);
}

/**
 * Check if a connection is local to this server
 */
export async function isLocalConnection(
	connectionId: string
): Promise<boolean> {
	return await pubsub.isLocalConnection(connectionId);
}

/**
 * Broadcast event to all local connections for a website
 */
function broadcastToWebsite(event: unknown): void {
	for (const [, socket] of localConnections) {
		// Check if this connection belongs to the website (would need to store this info)
		// For now, broadcast to all local connections
		try {
			socket.send(JSON.stringify(event));
		} catch {
			// Ignore send errors
		}
	}
}

/**
 * Send event to a specific connection
 */
function sendToConnection(connectionId: string, event: unknown): void {
	const socket = localConnections.get(connectionId);
	if (socket) {
		try {
			socket.send(JSON.stringify(event));
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
	websiteId?: string
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
				broadcastToWebsite(event);
			} else {
				sendToConnection(connectionId, event);
			}
		}
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
		`connection:${connectionId}`
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
	if (!privateKey) {
		privateKey = c.req.query("token");
	}
	if (!publicKey) {
		publicKey = c.req.query("publicKey");
	}
	if (!visitorId) {
		visitorId = c.req.query("visitorId");
	}

	const origin = c.req.header("Origin");
	const secWebSocketOrigin = c.req.header("Sec-WebSocket-Origin");
	const actualOrigin = origin || secWebSocketOrigin;

	return { privateKey, publicKey, actualOrigin, visitorId };
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
 * Log authentication attempt if logging is enabled
 */
function logAuthAttempt(
	hasPrivateKey: boolean,
	hasPublicKey: boolean,
	actualOrigin: string | undefined,
	url: string
): void {
	if (AUTH_LOGS_ENABLED) {
		console.log("[WebSocket Auth] Authentication attempt:", {
			hasPrivateKey,
			hasPublicKey,
			origin: actualOrigin,
			url,
		});
	}
}

/**
 * Log authentication success if logging is enabled
 */
function logAuthSuccess(result: {
	apiKey: ApiKeyWithWebsiteAndOrganization;
	isTestKey: boolean;
}): void {
	if (AUTH_LOGS_ENABLED) {
		console.log("[WebSocket Auth] Authentication successful:", {
			apiKeyId: result.apiKey.id,
			organizationId: result.apiKey.organization.id,
			websiteId: result.apiKey.website?.id,
			isTestKey: result.isTestKey,
		});
	}
}

/**
 * Result of a successful WebSocket authentication
 */
type WebSocketAuthSuccess = {
	organizationId?: string;
	websiteId?: string;
	userId?: string;
	visitorId?: string;
	apiKey?: ApiKeyWithWebsiteAndOrganization;
	isTestKey?: boolean;
};

/**
 * Authenticate WebSocket connection
 * Accept either API keys (public/private) or a Better Auth session via cookies
 */
async function authenticateWebSocketConnection(
	c: Context
): Promise<WebSocketAuthSuccess | null> {
	try {
		// Extract credentials
		const { privateKey, publicKey, actualOrigin, visitorId } =
			extractAuthCredentials(c);

		logAuthAttempt(!!privateKey, !!publicKey, actualOrigin, c.req.url);

		// Parse origin details
		let { protocol, hostname } = parseOriginDetails(actualOrigin);

		// Fallback to request headers if no origin
		if (!hostname) {
			const requestDetails = extractFromRequest(c);
			protocol = requestDetails.protocol;
			hostname = requestDetails.hostname;
		}

		const options: AuthValidationOptions = {
			origin: actualOrigin,
			protocol,
			hostname,
		};

		// Store the result with visitorId
		let result: WebSocketAuthSuccess | null = null;

		// If an API key was provided, authenticate with key-based flow
		if (privateKey || publicKey) {
			result = await authenticateWithApiKey(privateKey, publicKey, options);
		} else {
			// Otherwise, attempt Better Auth session-based authentication via cookies
			result = await authenticateWithSession(c);
		}

		// Add visitorId to the result if authentication was successful
		if (result) {
			result.visitorId = visitorId;
		}

		return result;
	} catch (error) {
		if (AUTH_LOGS_ENABLED) {
			console.error("[WebSocket Auth] Authentication failed:", error);
		}

		if (error instanceof AuthValidationError) {
			// Return null to handle the error in onOpen
			return null;
		}

		throw error;
	}
}

async function authenticateWithApiKey(
	privateKey: string | undefined,
	publicKey: string | undefined,
	options: AuthValidationOptions
): Promise<WebSocketAuthSuccess> {
	const result = await performAuthentication(
		privateKey,
		publicKey,
		db,
		options
	);
	logAuthSuccess(result);
	return {
		apiKey: result.apiKey,
		isTestKey: result.isTestKey,
		organizationId: result.apiKey.organization.id,
		websiteId: result.apiKey.website?.id,
	};
}

async function authenticateWithSession(
	c: Context
): Promise<WebSocketAuthSuccess | null> {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		if (AUTH_LOGS_ENABLED) {
			console.log("[WebSocket Auth] No API key or session provided");
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
			"[WebSocket Auth] Session found but no active organization; proceeding without website context"
		);
	}

	return {
		organizationId: organizationId ?? undefined,
		websiteId,
		userId: session.user.id,
	};
}

export const upgradedWebsocket = upgradeWebSocket(async (c) => {
	// Perform authentication during the upgrade phase
	const authResult = await authenticateWebSocketConnection(c);

	return {
		async onOpen(evt, ws) {
			const connectionId = generateConnectionId();

			// Check if authentication was successful
			if (!authResult) {
				console.error(
					`[WebSocket] Authentication failed for connection: ${connectionId}`
				);
				ws.send(
					JSON.stringify({
						error: "Authentication failed",
						message:
							"Authentication failed: Provide a valid API key or be signed in.",
					})
				);
				ws.close(1008, "Authentication failed");
				return;
			}

			// Check if we have either a user ID or visitor ID
			if (!(authResult.userId || authResult.visitorId)) {
				console.error(
					`[WebSocket] No user ID or visitor ID provided for connection: ${connectionId}`
				);
				ws.send(
					JSON.stringify({
						error: "Identification required",
						message:
							"Either authenticate with credentials or provide a visitor ID via X-Visitor-Id header or query parameter.",
					})
				);
				ws.close(1008, "Identification required");
				return;
			}

			// Use authenticated user id if available; otherwise use visitor id for connection tracking
		const userId = authResult.userId ?? authResult.visitorId;

			// Register connection in Redis for horizontal scaling
			const connectionInfo: ConnectionInfo = {
				connectionId,
				serverId: pubsub.getServerId(),
				userId: authResult.userId,
				visitorId: authResult.visitorId,
				websiteId: authResult.websiteId,
				organizationId: authResult.organizationId,
				connectedAt: Date.now(),
				lastHeartbeat: Date.now(),
			};

			await pubsub.registerConnection(connectionInfo);
			// Track socket locally for this server instance
			localConnections.set(connectionId, ws.raw as RawSocket);

			// Store just the connectionId as a custom property
			if (ws.raw) {
				(ws.raw as ServerWebSocket & { connectionId?: string }).connectionId =
					connectionId;
			}

			console.log(
				`[WebSocket] Connection opened: ${connectionId} for organization: ${authResult.organizationId}`
			);

			// Send successful connection message
			ws.send(
				JSON.stringify({
					type: "CONNECTION_ESTABLISHED",
					data: {
						connectionId,
						userId: authResult.userId,
						visitorId: authResult.visitorId,
						organizationId: authResult.organizationId,
						websiteId: authResult.websiteId,
						timestamp: Date.now(),
					},
				})
			);

			// Emit USER_CONNECTED or VISITOR_CONNECTED event based on authentication type
			const event: RealtimeEvent = {
				type: authResult.userId ? "USER_CONNECTED" : "VISITOR_CONNECTED",
				data: authResult.userId
					? {
							userId: authResult.userId,
							connectionId,
							timestamp: Date.now(),
						}
					: {
							visitorId: authResult.visitorId,
							connectionId,
							timestamp: Date.now(),
						},
				timestamp: Date.now(),
			};

			const context: EventContext = {
				connectionId,
				userId: authResult.userId,
				visitorId: authResult.visitorId,
				websiteId: authResult.websiteId,
				organizationId: authResult.organizationId,
				ws: undefined,
			};

			routeEvent(event, context);

			// Set up subscriptions for this connection
			await ensureSubscriptions(connectionId, authResult.websiteId);

			// Update presence to online for authenticated users or visitors
			if (authResult.websiteId) {
				const presenceId = authResult.userId || authResult.visitorId;
				if (presenceId) {
					await pubsub.updatePresence(presenceId, "online", authResult.websiteId);
				}
			}

			// Update last seen timestamps
			try {
				// If it's an authenticated user, update their lastSeenAt
				if (authResult.userId) {
					await updateUserLastSeen(db, authResult.userId);
				}

				// If we have a visitor ID and website context, update visitor's lastSeenAt
				if (
					authResult.visitorId &&
					authResult.websiteId &&
					authResult.organizationId
				) {
					await upsertVisitor(db, {
						websiteId: authResult.websiteId,
						organizationId: authResult.organizationId,
						visitorId: authResult.visitorId,
					});
				}
			} catch (error) {
				console.error(
					"[WebSocket] Error updating last seen timestamps:",
					error
				);
				// Don't fail the connection if last seen update fails
			}
		},

		onMessage(evt, ws) {
			// Get connectionId from the WebSocket
			const connectionId = ws.raw
				? (ws.raw as ServerWebSocket & { connectionId?: string }).connectionId
				: undefined;

			if (!(connectionId && localConnections.has(connectionId))) {
				console.error("[WebSocket] No connection found");
				ws.send(
					JSON.stringify({
						error: "Connection not authenticated",
						message: "Please reconnect with valid authentication.",
					})
				);
				return;
			}

			try {
				const message = JSON.parse(evt.data.toString());

				if (!(message.type && isValidEventType(message.type))) {
					console.error(`[WebSocket] Invalid event type: ${message.type}`);
					ws.send(
						JSON.stringify({
							error: "Invalid event type",
							type: message.type,
						})
					);
					return;
				}

				// Validate event data
				const validatedData = validateRealtimeEvent(message.type, message.data);

				const event: RealtimeEvent = {
					type: message.type,
					data: validatedData,
					timestamp: Date.now(),
				};

				// We'll need to get connection info from Redis for context
				// For now, create minimal context with connectionId
				const context: EventContext = {
					connectionId,
					userId: undefined, // Would need to fetch from Redis
					websiteId: undefined, // Would need to fetch from Redis
					organizationId: undefined, // Would need to fetch from Redis
					ws: undefined,
				};

				routeEvent(event, context);
			} catch (error) {
				console.error("[WebSocket] Error processing message:", error);
				ws.send(
					JSON.stringify({
						error: "Invalid message format",
						details: error instanceof Error ? error.message : "Unknown error",
					})
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
