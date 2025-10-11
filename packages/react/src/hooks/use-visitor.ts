import type {
	PublicVisitor,
	VisitorMetadata,
	VisitorResponse,
} from "@cossistant/types";
import { useCallback } from "react";
import { useSupport } from "../provider";

export type UseVisitorReturn = {
	visitor: PublicVisitor | null;
	setVisitorMetadata: (
		metadata: VisitorMetadata
	) => Promise<VisitorResponse | null>;
	identify: (params: {
		externalId?: string;
		email?: string;
		name?: string;
		image?: string;
		metadata?: Record<string, unknown>;
	}) => Promise<{ contactId: string; visitorId: string } | null>;
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
 * Exposes the current visitor plus helpers to identify and update metadata.
 *
 * Note: Metadata is stored on contacts, not visitors. When you call
 * setVisitorMetadata, it will update the contact metadata if the visitor
 * has been identified. If not, you must call identify() first.
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

	const identify = useCallback<
		(params: {
			externalId?: string;
			email?: string;
			name?: string;
			image?: string;
			metadata?: Record<string, unknown>;
		}) => Promise<{ contactId: string; visitorId: string } | null>
	>(
		async (params) => {
			if (!visitorId) {
				safeWarn(
					"No visitor is associated with this session; identify skipped"
				);
				return null;
			}

			try {
				const result = await client.identify(params);

				return {
					contactId: result.contact.id,
					visitorId: result.visitorId,
				};
			} catch (error) {
				safeError("Failed to identify visitor", error);
				return null;
			}
		},
		[client, visitorId]
	);

	return {
		visitor,
		setVisitorMetadata,
		identify,
	};
}
