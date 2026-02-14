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
		const processEnv = typeof process !== "undefined" ? process.env : undefined;
		const keyFromEnv =
			processEnv?.NEXT_PUBLIC_COSSISTANT_API_KEY ||
			processEnv?.COSSISTANT_API_KEY;
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
