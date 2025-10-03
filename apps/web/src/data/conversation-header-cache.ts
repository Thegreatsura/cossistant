import type { RouterOutputs } from "@api/trpc/types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

type ConversationHeadersPage =
	RouterOutputs["conversation"]["listConversationsHeaders"];
export type ConversationHeader = ConversationHeadersPage["items"][number];

export function createConversationHeadersInfiniteQueryKey(
	baseQueryKey: readonly unknown[]
) {
	return [...baseQueryKey, { type: "infinite" }] as const;
}

export function updateConversationHeaderInCache(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	conversationId: string,
	updater: (conversation: ConversationHeader) => ConversationHeader
) {
	queryClient.setQueryData<InfiniteData<ConversationHeadersPage>>(
		queryKey,
		(existing) => {
			if (!existing?.pages) {
				return existing;
			}

			let updated = false;

			const pages = existing.pages.map((page) => {
				let pageUpdated = false;

				const items = page.items.map((item) => {
					if (item.id !== conversationId) {
						return item;
					}

					pageUpdated = true;
					updated = true;
					return updater(item);
				});

				if (!pageUpdated) {
					return page;
				}

				return {
					...page,
					items,
				};
			});

			if (!updated) {
				return existing;
			}

			return {
				pages,
				pageParams: [...existing.pageParams],
			};
		}
	);
}
