"use client";

import { CossistantClient } from "@cossistant/core";
import type { CossistantConfig } from "@cossistant/types";
import { useMemo } from "react";

export type ConfigurationError = {
	type: "missing_api_key" | "invalid_api_key";
	message: string;
	envVarName: string;
};

export type UseClientResult =
	| {
			client: CossistantClient;
			error: null;
			configurationError: null;
	  }
	| {
			client: null;
			error: null;
			configurationError: ConfigurationError;
	  };

/**
 * Detect if running in a Next.js environment.
 */
function isNextJSEnvironment(): boolean {
	if (typeof window !== "undefined") {
		// Client-side: check for Next.js data
		return "__NEXT_DATA__" in window;
	}
	// Server-side: check for Next.js runtime
	return typeof process !== "undefined" && "__NEXT_RUNTIME" in process.env;
}

/**
 * Creates a memoised `CossistantClient` instance using the provided endpoints
 * and public key. When no key is passed the hook falls back to environment
 * variables and surfaces missing configuration errors through the returned
 * `configurationError` field instead of throwing.
 */
export function useClient(
	publicKey: string | undefined,
	apiUrl = "https://api.cossistant.com/v1",
	wsUrl = "wss://api.cossistant.com/ws"
): UseClientResult {
	return useMemo(() => {
		// IMPORTANT: Must use DIRECT access to env vars for build-time inlining
		// Next.js/Webpack: requires direct `process.env.X` access to inline at build time
		// Vite: requires direct `import.meta.env.X` access
		// Dynamic access (e.g., `const env = process.env; env.X`) breaks inlining!
		let keyFromEnv: string | undefined;

		// Try Next.js/Node.js environment variables
		try {
			keyFromEnv =
				process.env.NEXT_PUBLIC_COSSISTANT_API_KEY ||
				process.env.COSSISTANT_API_KEY;
		} catch {
			// process not available (Vite/browser-only environment)
		}

		// Fallback to Vite environment variables
		if (!keyFromEnv) {
			try {
				// @ts-expect-error - import.meta.env is Vite-specific and not in standard types
				keyFromEnv = import.meta.env?.VITE_COSSISTANT_API_KEY;
			} catch {
				// import.meta not available (older bundlers)
			}
		}

		const keyToUse = publicKey ?? keyFromEnv;

		if (!keyToUse) {
			const isNextJS = isNextJSEnvironment();
			const envVarName = isNextJS
				? "NEXT_PUBLIC_COSSISTANT_API_KEY"
				: "COSSISTANT_API_KEY";

			return {
				client: null,
				error: null,
				configurationError: {
					type: "missing_api_key",
					message: `Public API key is required. Add ${envVarName} to your environment variables.`,
					envVarName,
				},
			};
		}

		const config: CossistantConfig = {
			apiUrl,
			wsUrl,
			publicKey: keyToUse,
		};

		try {
			const client = new CossistantClient(config);
			return { client, error: null, configurationError: null };
		} catch (err: unknown) {
			const isNextJS = isNextJSEnvironment();
			const envVarName = isNextJS
				? "NEXT_PUBLIC_COSSISTANT_API_KEY"
				: "COSSISTANT_API_KEY";

			return {
				client: null,
				error: null,
				configurationError: {
					type: "missing_api_key",
					message:
						err instanceof Error
							? err.message
							: "Failed to initialize Cossistant client",
					envVarName,
				},
			};
		}
	}, [publicKey, apiUrl, wsUrl]);
}
