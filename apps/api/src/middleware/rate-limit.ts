import { getRateLimitStore } from "@api/lib/rate-limit-store";
import type { Context, Next } from "hono";
import { rateLimiter } from "hono-rate-limiter";

/**
 * Default rate limiter for general API endpoints
 * Allows 100 requests per minute per IP
 */
export const defaultRateLimiter = rateLimiter({
	windowMs: 60 * 1000, // 1 minute
	limit: 100, // 100 requests per minute
	standardHeaders: "draft-6",
	keyGenerator: (c: Context) => {
		// Use IP address as the key
		// Try different headers that might contain the real IP
		const ip =
			c.req.header("x-forwarded-for")?.split(",")[0] ||
			c.req.header("x-real-ip") ||
			c.req.header("cf-connecting-ip") || // Cloudflare
			c.req.header("x-client-ip") ||
			c.req.header("x-original-forwarded-for") ||
			c.req.header("x-forwarded") ||
			c.req.header("forwarded-for") ||
			c.req.header("forwarded") ||
			"unknown";
		return ip;
	},
	store: getRateLimitStore(),
	message: "Too many requests, please try again later.",
	skip: (c: Context) => {
		// Skip rate limiting for health checks
		return c.req.path === "/health";
	},
});

/**
 * Strict rate limiter for authentication endpoints
 * Allows 5 requests per minute per IP
 */
export const authRateLimiter = rateLimiter({
	windowMs: 60 * 1000, // 1 minute
	limit: 30, // 5 requests per minute
	standardHeaders: "draft-6",
	keyGenerator: (c: Context) => {
		const ip =
			c.req.header("x-forwarded-for")?.split(",")[0] ||
			c.req.header("x-real-ip") ||
			c.req.header("cf-connecting-ip") ||
			c.req.header("x-client-ip") ||
			"unknown";
		return `auth:${ip}`;
	},
	store: getRateLimitStore(),
	message: "Too many authentication attempts, please try again later.",
});

/**
 * Rate limiter for TRPC endpoints
 * Allows 50 requests per minute per IP
 */
export const trpcRateLimiter = rateLimiter({
	windowMs: 60 * 1000, // 1 minute
	limit: 60, // 50 requests per minute
	standardHeaders: "draft-6",
	keyGenerator: (c: Context) => {
		const ip =
			c.req.header("x-forwarded-for")?.split(",")[0] ||
			c.req.header("x-real-ip") ||
			c.req.header("cf-connecting-ip") ||
			c.req.header("x-client-ip") ||
			"unknown";
		return `trpc:${ip}`;
	},
	store: getRateLimitStore(),
	message: {
		error: "Too many requests",
		code: "TOO_MANY_REQUESTS",
		message: "Rate limit exceeded. Please try again later.",
	},
});

/**
 * Rate limiter for WebSocket connections
 * Allows 10 connections per minute per IP
 */
export const websocketRateLimiter = rateLimiter({
	windowMs: 60 * 1000, // 1 minute
	limit: 10, // 10 connections per minute
	standardHeaders: "draft-6",
	keyGenerator: (c: Context) => {
		const ip =
			c.req.header("x-forwarded-for")?.split(",")[0] ||
			c.req.header("x-real-ip") ||
			c.req.header("cf-connecting-ip") ||
			c.req.header("x-client-ip") ||
			"unknown";
		return `ws:${ip}`;
	},
	store: getRateLimitStore(),
	message: "Too many WebSocket connection attempts, please try again later.",
});

/**
 * Custom rate limiter factory for specific endpoints
 */
export function createCustomRateLimiter(options: {
	windowMs?: number;
	limit: number;
	keyPrefix?: string;
	message?: string | Record<string, unknown>;
}) {
	return rateLimiter({
		windowMs: options.windowMs || 60 * 1000, // Default 1 minute
		limit: options.limit,
		standardHeaders: "draft-6",
		keyGenerator: (c: Context) => {
			const ip =
				c.req.header("x-forwarded-for")?.split(",")[0] ||
				c.req.header("x-real-ip") ||
				c.req.header("cf-connecting-ip") ||
				c.req.header("x-client-ip") ||
				"unknown";
			return options.keyPrefix ? `${options.keyPrefix}:${ip}` : ip;
		},
		store: getRateLimitStore(),
		message: options.message || "Too many requests, please try again later.",
	});
}
