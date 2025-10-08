import type { RouterOutputs } from "@api/trpc/types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export type ConversationHeadersPage =
        RouterOutputs["conversation"]["listConversationsHeaders"];
export type ConversationHeader = ConversationHeadersPage["items"][number];

export function createConversationHeadersInfiniteQueryKey(
        baseQueryKey: readonly unknown[]
) {
        return [...baseQueryKey, { type: "infinite" }] as const;
}

function hasConversation(
        page: ConversationHeadersPage,
        conversationId: string
): boolean {
        return page.items.some((item) => item.id === conversationId);
}

export function prependConversationHeaderInCache(
        queryClient: QueryClient,
        queryKey: readonly unknown[],
        header: ConversationHeader
): void {
        queryClient.setQueryData<InfiniteData<ConversationHeadersPage>>(
                queryKey,
                (existing) => {
                        if (!existing) {
                                return {
                                        pages: [
                                                {
                                                        items: [header],
                                                        nextCursor: null,
                                                },
                                        ],
                                        pageParams: [null],
                                } satisfies InfiniteData<ConversationHeadersPage>;
                        }

                        if (existing.pages.some((page) => hasConversation(page, header.id))) {
                                return existing;
                        }

                        if (existing.pages.length === 0) {
                                return {
                                        pages: [
                                                {
                                                        items: [header],
                                                        nextCursor: null,
                                                },
                                        ],
                                        pageParams: [...existing.pageParams],
                                } satisfies InfiniteData<ConversationHeadersPage>;
                        }

                        const [firstPage, ...rest] = existing.pages;

                        return {
                                pages: [
                                        {
                                                ...firstPage,
                                                items: [header, ...firstPage.items],
                                        },
                                        ...rest,
                                ],
                                pageParams: [...existing.pageParams],
                        } satisfies InfiniteData<ConversationHeadersPage>;
                }
        );
}
