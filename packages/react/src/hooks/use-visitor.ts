import type {
	PublicVisitor,
	VisitorMetadata,
	VisitorResponse,
} from "@cossistant/types";
import { useCallback } from "react";
import { useSupport } from "..";

export type UseVisitorReturn = {
	visitor: PublicVisitor | null;
	setVisitorMetadata: (
		metadata: VisitorMetadata
	) => Promise<VisitorResponse | null>;
};

function safeWarn(message: string): void {
	if (typeof console !== "undefined" && typeof console.warn === "function") {
		console.warn(message);
	}
}

function safeError(message: string, error: unknown): void {
	if (typeof console !== "undefined" && typeof console.error === "function") {
		console.error(message, error);
	}
}

/**
 * Exposes the current visitor plus a safe helper to update metadata while
 * guarding against missing client or visitor context.
 */
export function useVisitor(): UseVisitorReturn {
	const { website, client } = useSupport();
	const visitor = website?.visitor || null;
	const visitorId = visitor?.id ?? null;

	const setVisitorMetadata = useCallback<
		(metadata: VisitorMetadata) => Promise<VisitorResponse | null>
	>(
		async (metadata) => {
			if (!visitorId) {
				safeWarn(
					"No visitor is associated with this session; metadata update skipped"
				);
				return null;
			}

			try {
				return await client.updateVisitorMetadata(metadata);
			} catch (error) {
				safeError("Failed to update visitor metadata", error);
				return null;
			}
		},
		[client, visitorId]
	);

	return {
		visitor,
		setVisitorMetadata,
	};
}
