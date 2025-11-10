"use client";

import { CossistantClient } from "@cossistant/core";
import type { CossistantConfig } from "@cossistant/types";
import { useMemo } from "react";

export type UseClientResult = {
	client: CossistantClient;
	error: Error | null;
};

/**
 * Creates a memoised `CossistantClient` instance using the provided endpoints
 * and public key. When no key is passed the hook falls back to environment
 * variables and surfaces missing configuration errors through the returned
 * `error` field.
 */
export function useClient(
	publicKey: string | undefined,
	apiUrl = "https://api.cossistant.com/v1",
	wsUrl = "wss://api.cossistant.com/ws"
): UseClientResult {
	const client = useMemo(() => {
		const keyFromEnv =
			process.env.NEXT_PUBLIC_COSSISTANT_API_KEY ||
			process.env.COSSISTANT_PUBLIC_KEY;
		const keyToUse = publicKey ?? keyFromEnv;

		if (!keyToUse) {
			throw new Error(
				"Public key is required. Please provide it as a prop or set NEXT_PUBLIC_COSSISTANT_API_KEY environment variable."
			);
		}

		const config: CossistantConfig = {
			apiUrl,
			wsUrl,
			publicKey: keyToUse,
		};

		try {
			return new CossistantClient(config);
		} catch (err: unknown) {
			throw err instanceof Error
				? err
				: new Error("Failed to initialize Cossistant client");
		}
	}, [publicKey, apiUrl, wsUrl]);

	return { client, error: null };
}
