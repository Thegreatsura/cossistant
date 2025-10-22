"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useMultimodalInput } from "@cossistant/react/hooks/private/use-multimodal-input";
import { useConversationSeen } from "@cossistant/react/hooks/use-conversation-seen";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { useWindowVisibilityFocus } from "@cossistant/react/hooks/use-window-visibility-focus";
import { CONVERSATION_AUTO_SEEN_DELAY_MS } from "@cossistant/react/hooks/use-conversation-auto-seen";
import { Conversation } from "@/components/conversation";
import type { ConversationHeaderNavigationProps } from "@/components/conversation/header/navigation";
import type { ConversationProps } from "@/components/conversation";
import { useInboxes } from "@/contexts/inboxes";
import { useWebsiteMembers } from "@/contexts/website";
import { useConversationActions } from "@/data/use-conversation-actions";
import { useConversationTimelineItems } from "@/data/use-conversation-timeline-items";
import { useVisitor } from "@/data/use-visitor";
import { useAgentTypingReporter } from "@/hooks/use-agent-typing-reporter";
import { useSendConversationMessage } from "@/hooks/use-send-conversation-message";
import { useSidebar } from "@/hooks/use-sidebars";

const MESSAGES_PAGE_LIMIT = 50;

type ConversationPaneProps = {
        conversationId: string;
        visitorId: string;
        websiteSlug: string;
        currentUserId: string;
};

export function ConversationPane({
        conversationId,
        visitorId,
        websiteSlug,
        currentUserId,
}: ConversationPaneProps) {
        const { submit: submitConversationMessage } = useSendConversationMessage({
                conversationId,
                websiteSlug,
                currentUserId,
                pageLimit: MESSAGES_PAGE_LIMIT,
        });

        const {
                handleInputChange: handleTypingChange,
                handleSubmit: handleTypingSubmit,
                stop: stopTyping,
        } = useAgentTypingReporter({
                conversationId,
                websiteSlug,
        });

        const {
                message,
                files,
                isSubmitting,
                error,
                setMessage,
                addFiles,
                removeFile,
                submit,
        } = useMultimodalInput({
                onSubmit: async (payload) => {
                        handleTypingSubmit();
                        await submitConversationMessage(payload);
                },
                onError: (submitError) => {
                        console.error("Failed to send message", submitError);
                },
        });

        const handleMessageChange = useCallback(
                (value: string) => {
                        setMessage(value);
                        handleTypingChange(value);
                },
                [handleTypingChange, setMessage]
        );

        useEffect(
                () => () => {
                        stopTyping();
                },
                [stopTyping]
        );

        const members = useWebsiteMembers();
        const {
                selectedConversation,
                previousConversation,
                nextConversation,
                navigateToPreviousConversation,
                navigateToNextConversation,
                goBack,
                statusCounts,
                selectedConversationIndex,
        } = useInboxes();

        const { open: isRightSidebarOpen, toggle: toggleRightSidebar } = useSidebar({
                position: "right",
        });
        const { open: isLeftSidebarOpen, toggle: toggleLeftSidebar } = useSidebar({
                position: "left",
        });

        const { markRead } = useConversationActions({
                conversationId,
                visitorId,
        });

        const lastMarkedMessageIdRef = useRef<string | null>(null);
        const markSeenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const { isPageVisible, hasWindowFocus } = useWindowVisibilityFocus();

        const { items, fetchNextPage, hasNextPage } = useConversationTimelineItems({
                conversationId,
                websiteSlug,
                options: { limit: MESSAGES_PAGE_LIMIT },
        });

        const { visitor, isLoading: isVisitorLoading } = useVisitor({ visitorId, websiteSlug });

        const seenData = useConversationSeen(conversationId, {
                initialData: selectedConversation?.seenData ?? [],
        });

        const lastMessage = useMemo(
                () => items.filter((item) => item.type === "message").at(-1) ?? null,
                [items]
        );

        useEffect(() => {
                if (markSeenTimeoutRef.current) {
                        clearTimeout(markSeenTimeoutRef.current);
                        markSeenTimeoutRef.current = null;
                }

                if (!lastMessage) {
                        return;
                }

                if (!selectedConversation || selectedConversation.id !== conversationId) {
                        lastMarkedMessageIdRef.current = null;
                        return;
                }

                if (!isPageVisible || !hasWindowFocus) {
                        return;
                }

                if (lastMessage.userId === currentUserId) {
                        lastMarkedMessageIdRef.current = lastMessage.id || null;
                        return;
                }

                const lastMessageCreatedAt = new Date(lastMessage.createdAt);
                const lastSeenAt = selectedConversation.lastSeenAt
                        ? new Date(selectedConversation.lastSeenAt)
                        : null;

                if (lastSeenAt && lastSeenAt >= lastMessageCreatedAt) {
                        lastMarkedMessageIdRef.current = lastMessage.id || null;
                        return;
                }

                if (lastMarkedMessageIdRef.current === (lastMessage.id || null)) {
                        return;
                }

                const pendingMessageId = lastMessage.id || null;

                markSeenTimeoutRef.current = setTimeout(() => {
                        const isVisibleNow =
                                typeof document !== "undefined" ? !document.hidden : true;
                        const hasFocusNow =
                                typeof document !== "undefined" &&
                                typeof document.hasFocus === "function"
                                        ? document.hasFocus()
                                        : true;

                        if (!isVisibleNow || !hasFocusNow) {
                                markSeenTimeoutRef.current = null;
                                return;
                        }

                        markRead()
                                .then(() => {
                                        lastMarkedMessageIdRef.current = pendingMessageId;
                                })
                                .catch(() => {
                                        // no-op: we'll retry on next render if needed
                                })
                                .finally(() => {
                                        markSeenTimeoutRef.current = null;
                                });
                }, CONVERSATION_AUTO_SEEN_DELAY_MS);

                return () => {
                        if (markSeenTimeoutRef.current) {
                                clearTimeout(markSeenTimeoutRef.current);
                                markSeenTimeoutRef.current = null;
                        }
                };
        }, [
                conversationId,
                currentUserId,
                hasWindowFocus,
                isPageVisible,
                lastMessage,
                markRead,
                selectedConversation,
        ]);

        useHotkeys(
                ["escape", "j", "k"],
                (_, handler) => {
                        switch (handler.keys?.join("")) {
                                case "escape":
                                        goBack();
                                        break;
                                case "j":
                                        if (previousConversation) {
                                                navigateToPreviousConversation();
                                        }
                                        break;
                                case "k":
                                        if (nextConversation) {
                                                navigateToNextConversation();
                                        }
                                        break;
                                default:
                                        break;
                        }
                },
                {
                        preventDefault: true,
                        enableOnContentEditable: false,
                        enableOnFormTags: false,
                }
        );

        const onFetchMoreIfNeeded = useCallback(async () => {
                if (hasNextPage) {
                        await fetchNextPage();
                }
        }, [fetchNextPage, hasNextPage]);

        if (!visitor) {
                return null;
        }

        if (!selectedConversation) {
                return null;
        }

        const navigationProps: ConversationHeaderNavigationProps = {
                onGoBack: goBack,
                onNavigateToPrevious: navigateToPreviousConversation,
                onNavigateToNext: navigateToNextConversation,
                hasPreviousConversation: Boolean(previousConversation),
                hasNextConversation: Boolean(nextConversation),
                selectedConversationIndex,
                totalOpenConversations: statusCounts.open,
        };

        const hasUnreadMessage = useMemo(() => {
                const lastTimelineItem = selectedConversation.lastTimelineItem ?? null;
                if (!lastTimelineItem) {
                        return false;
                }

                if (lastTimelineItem.userId === currentUserId) {
                        return false;
                }

                const lastTimelineItemCreatedAt = lastTimelineItem.createdAt
                        ? new Date(lastTimelineItem.createdAt)
                        : null;
                const lastSeenAt = selectedConversation.lastSeenAt
                        ? new Date(selectedConversation.lastSeenAt)
                        : null;

                if (!lastTimelineItemCreatedAt) {
                        return false;
                }

                if (!lastSeenAt) {
                        return true;
                }

                return lastTimelineItemCreatedAt > lastSeenAt;
        }, [currentUserId, selectedConversation]);

        const conversationProps: ConversationProps = {
                header: {
                        isLeftSidebarOpen,
                        isRightSidebarOpen,
                        onToggleLeftSidebar: toggleLeftSidebar,
                        onToggleRightSidebar: toggleRightSidebar,
                        navigation: navigationProps,
                        conversationId,
                        visitorId,
                        status: selectedConversation?.status,
                        deletedAt: selectedConversation?.deletedAt ?? null,
                        hasUnreadMessage,
                        visitorIsBlocked: selectedConversation?.visitor.isBlocked ?? null,
                },
                timeline: {
                        availableAIAgents: [],
                        conversationId,
                        currentUserId,
                        items: items as TimelineItem[],
                        onFetchMoreIfNeeded,
                        seenData,
                        teamMembers: members,
                        visitor,
                },
                input: {
                        allowedFileTypes: ["image/*", "application/pdf", "text/*"],
                        error,
                        files,
                        isSubmitting,
                        maxFileSize: 10 * 1024 * 1024,
                        maxFiles: 2,
                        onChange: handleMessageChange,
                        onFileSelect: addFiles,
                        onRemoveFile: removeFile,
                        onSubmit: submit,
                        placeholder: "Type your message...",
                        value: message,
                },
                visitorSidebar: {
                        isLoading: isVisitorLoading,
                        visitor,
                },
        };

        return <Conversation {...conversationProps} />;
}
