import type { QueryClient } from "@tanstack/react-query";

type ConversationHeadersQueryInput = {
        websiteSlug?: string;
};

type QueryKeyInput = {
        input?: ConversationHeadersQueryInput;
        type?: string;
};

function extractHeadersQueryInput(
        queryKey: readonly unknown[]
): ConversationHeadersQueryInput | null {
        if (queryKey.length < 2) {
                return null;
        }

        const maybeInput = queryKey[1];
        if (!maybeInput || typeof maybeInput !== "object") {
                return null;
        }

        const input = (maybeInput as QueryKeyInput).input;
        if (!input || typeof input !== "object") {
                return null;
        }

        return input;
}

function isInfiniteQueryKey(queryKey: readonly unknown[]): boolean {
        const marker = queryKey[2];
        return Boolean(
                marker &&
                        typeof marker === "object" &&
                        "type" in marker &&
                        (marker as QueryKeyInput).type === "infinite"
        );
}

export function forEachConversationHeadersQuery(
        queryClient: QueryClient,
        websiteSlug: string,
        callback: (queryKey: readonly unknown[]) => void
): void {
        const queries = queryClient
                .getQueryCache()
                .findAll({ queryKey: [["conversation", "listConversationsHeaders"]] });

        for (const query of queries) {
                const queryKey = query.queryKey as readonly unknown[];

                if (!isInfiniteQueryKey(queryKey)) {
                        continue;
                }

                const input = extractHeadersQueryInput(queryKey);
                if (!input) {
                        continue;
                }

                if (input.websiteSlug && input.websiteSlug !== websiteSlug) {
                        continue;
                }

                callback(queryKey);
        }
}
