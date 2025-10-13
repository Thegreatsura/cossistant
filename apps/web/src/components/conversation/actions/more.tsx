import { ConversationStatus } from "@cossistant/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuGroup,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { useConversationActions } from "@/data/use-conversation-actions";
import { cn } from "@/lib/utils";

export function MoreConversationActions({
        className,
        conversationId,
        visitorId,
        status,
        visitorIsBlocked,
        deletedAt,
        hasUnreadMessage = false,
}: {
        className?: string;
        conversationId: string;
        visitorId?: string | null;
        status?: ConversationStatus;
        visitorIsBlocked?: boolean | null;
        deletedAt?: string | null;
        hasUnreadMessage?: boolean;
}) {
        const triggerRef = useRef<HTMLButtonElement | null>(null);
        const [open, setOpen] = useState(false);
        const [tooltipSuppressed, setTooltipSuppressed] = useState(false);
        const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
                null
        );

        const {
                markResolved,
                markOpen,
                markArchived,
                markUnarchived,
                markRead,
                markUnread,
                markSpam,
                markNotSpam,
                blockVisitor,
                unblockVisitor,
                pendingAction,
        } = useConversationActions({ conversationId, visitorId });

        const isResolved = status === ConversationStatus.RESOLVED;
        const isSpam = status === ConversationStatus.SPAM;
        const isArchived = deletedAt !== null;
        const isBlocked = Boolean(visitorIsBlocked);
        const canToggleBlock = Boolean(visitorId);

        const resolveLabel = isResolved ? "Mark unresolved" : "Mark resolved";
        const spamLabel = isSpam ? "Mark not spam" : "Mark spam";
        const archiveLabel = isArchived ? "Unarchive" : "Mark archived";
        const blockLabel = isBlocked ? "Unblock visitor" : "Block visitor";

        const resolvePending = isResolved
                ? pendingAction.markOpen
                : pendingAction.markResolved;
        const spamPending = isSpam
                ? pendingAction.markNotSpam
                : pendingAction.markSpam;
        const archivePending = isArchived
                ? pendingAction.markUnarchived
                : pendingAction.markArchived;
        const blockPending = isBlocked
                ? pendingAction.unblockVisitor
                : pendingAction.blockVisitor;

        const shouldShowMarkRead = hasUnreadMessage;
        const shouldShowMarkUnread = !hasUnreadMessage;

        const resolveSuccessMessage = isResolved
                ? "Conversation marked unresolved"
                : "Conversation marked resolved";
        const archiveSuccessMessage = isArchived
                ? "Conversation unarchived"
                : "Conversation archived";
        const spamSuccessMessage = isSpam
                ? "Conversation marked as not spam"
                : "Conversation marked as spam";
        const blockSuccessMessage = isBlocked
                ? "Visitor unblocked"
                : "Visitor blocked";

        const suppressTooltipTemporarily = useCallback(() => {
                setTooltipSuppressed(true);

                if (tooltipTimeoutRef.current) {
                        clearTimeout(tooltipTimeoutRef.current);
                }

                tooltipTimeoutRef.current = setTimeout(() => {
                        setTooltipSuppressed(false);
                        tooltipTimeoutRef.current = null;
                }, 200);
        }, []);

        const handleOpenChange = useCallback(
                (nextOpen: boolean) => {
                        setOpen(nextOpen);

                        if (nextOpen) {
                                setTooltipSuppressed(true);
                                if (tooltipTimeoutRef.current) {
                                        clearTimeout(tooltipTimeoutRef.current);
                                        tooltipTimeoutRef.current = null;
                                }
                                return;
                        }

                        triggerRef.current?.blur();
                        suppressTooltipTemporarily();
                },
                [suppressTooltipTemporarily]
        );

        const closeMenu = useCallback(() => {
                handleOpenChange(false);
        }, [handleOpenChange]);

        const runAction = useCallback(
                async (
                        action: () => Promise<unknown | boolean>,
                        successMessage?: string
                ) => {
                        closeMenu();

                        try {
                                const result = await action();

                                if (successMessage && result !== false) {
                                        toast.success(successMessage);
                                }
                        } catch (error) {
                                console.error("Failed to run conversation action", error);
                        }
                },
                [closeMenu]
        );

        const preventHotkeysOptions = {
                enableOnContentEditable: false,
                enableOnFormTags: false,
                preventDefault: true,
        } as const;

        useHotkeys(
                "r",
                (event) => {
                        event.preventDefault();

                        if (resolvePending) {
                                return;
                        }

                        void runAction(
                                async () => {
                                        if (isResolved) {
                                                await markOpen();
                                                return;
                                        }
                                        await markResolved();
                                },
                                resolveSuccessMessage
                        );
                },
                {
                        ...preventHotkeysOptions,
                        enabled: !resolvePending,
                },
                [
                        isResolved,
                        markOpen,
                        markResolved,
                        resolvePending,
                        resolveSuccessMessage,
                        runAction,
                ]
        );

        useHotkeys(
                "delete",
                (event) => {
                        event.preventDefault();

                        if (archivePending) {
                                return;
                        }

                        void runAction(
                                async () => {
                                        if (isArchived) {
                                                await markUnarchived();
                                                return;
                                        }
                                        await markArchived();
                                },
                                archiveSuccessMessage
                        );
                },
                {
                        ...preventHotkeysOptions,
                        enabled: !archivePending,
                },
                [
                        archivePending,
                        archiveSuccessMessage,
                        isArchived,
                        markArchived,
                        markUnarchived,
                        runAction,
                ]
        );

        useHotkeys(
                "u",
                (event) => {
                        event.preventDefault();

                        if (shouldShowMarkRead) {
                                if (pendingAction.markRead) {
                                        return;
                                }

                                void runAction(
                                        async () => {
                                                await markRead();
                                        },
                                        "Conversation marked as read"
                                );
                                return;
                        }

                        if (!shouldShowMarkUnread || pendingAction.markUnread) {
                                return;
                        }

                        void runAction(
                                async () => {
                                        await markUnread();
                                },
                                "Conversation marked as unread"
                        );
                },
                {
                        ...preventHotkeysOptions,
                        enabled:
                                (shouldShowMarkRead && !pendingAction.markRead) ||
                                (shouldShowMarkUnread && !pendingAction.markUnread),
                },
                [
                        markRead,
                        markUnread,
                        pendingAction.markRead,
                        pendingAction.markUnread,
                        runAction,
                        shouldShowMarkRead,
                        shouldShowMarkUnread,
                ]
        );

        useHotkeys(
                "p",
                (event) => {
                        event.preventDefault();

                        if (spamPending) {
                                return;
                        }

                        void runAction(
                                async () => {
                                        if (isSpam) {
                                                await markNotSpam();
                                                return;
                                        }
                                        await markSpam();
                                },
                                spamSuccessMessage
                        );
                },
                {
                        ...preventHotkeysOptions,
                        enabled: !spamPending,
                },
                [
                        isSpam,
                        markNotSpam,
                        markSpam,
                        runAction,
                        spamPending,
                        spamSuccessMessage,
                ]
        );

        useEffect(() => {
                return () => {
                        if (tooltipTimeoutRef.current) {
                                clearTimeout(tooltipTimeoutRef.current);
                        }
                };
        }, []);

        const handleCopyId = useCallback(async () => {
                try {
                        if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
                                return false;
                        }
                        await navigator.clipboard.writeText(conversationId);
                        return true;
                } catch (error) {
                        console.error("Failed to copy conversation id", error);
                        return false;
                }
        }, [conversationId]);

        const handleCopyUrl = useCallback(async () => {
                try {
                        if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
                                return false;
                        }
                        await navigator.clipboard.writeText(window.location.href);
                        return true;
                } catch (error) {
                        console.error("Failed to copy conversation URL", error);
                        return false;
                }
        }, []);

        return (
                <div className={cn("flex items-center gap-2 pr-1", className)}>
                        <DropdownMenu onOpenChange={handleOpenChange} open={open}>
                                <TooltipOnHover
                                        content="More options"
                                        forceClose={open || tooltipSuppressed}
                                >
                                        <DropdownMenuTrigger asChild>
                                                <Button
                                                        ref={triggerRef}
                                                        size="icon-small"
                                                        variant="ghost"
                                                >
                                                        <Icon name="more" variant="filled" />
                                                </Button>
                                        </DropdownMenuTrigger>
                                </TooltipOnHover>
                                <DropdownMenuContent
                                        align="end"
                                        className="min-w-56"
                                        side="top"
                                        sideOffset={4}
                                >
                                        <DropdownMenuGroup>
                                                <DropdownMenuItem
                                                        disabled={resolvePending}
                                                        onSelect={(event) => {
                                                                event.preventDefault();
                                                                void runAction(
                                                                        async () => {
                                                                                if (isResolved) {
                                                                                        await markOpen();
                                                                                        return;
                                                                                }
                                                                                await markResolved();
                                                                        },
                                                                        resolveSuccessMessage
                                                                );
                                                        }}
                                                        shortcuts={["R"]}
                                                >
                                                        {resolveLabel}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                        disabled={archivePending}
                                                        onSelect={(event) => {
                                                                event.preventDefault();
                                                                void runAction(
                                                                        async () => {
                                                                                if (isArchived) {
                                                                                        await markUnarchived();
                                                                                        return;
                                                                                }
                                                                                await markArchived();
                                                                        },
                                                                        archiveSuccessMessage
                                                                );
                                                        }}
                                                        shortcuts={["Delete"]}
                                                >
                                                        {archiveLabel}
                                                </DropdownMenuItem>
                                                {shouldShowMarkRead && (
                                                        <DropdownMenuItem
                                                                disabled={pendingAction.markRead}
                                                                onSelect={(event) => {
                                                                        event.preventDefault();
                                                                        void runAction(
                                                                                async () => {
                                                                                        await markRead();
                                                                                },
                                                                                "Conversation marked as read"
                                                                        );
                                                                }}
                                                                shortcuts={["U"]}
                                                        >
                                                                Mark as read
                                                        </DropdownMenuItem>
                                                )}
                                                {shouldShowMarkUnread && (
                                                        <DropdownMenuItem
                                                                disabled={pendingAction.markUnread}
                                                                onSelect={(event) => {
                                                                        event.preventDefault();
                                                                        void runAction(
                                                                                async () => {
                                                                                        await markUnread();
                                                                                },
                                                                                "Conversation marked as unread"
                                                                        );
                                                                }}
                                                                shortcuts={["U"]}
                                                        >
                                                                Mark as unread
                                                        </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                        disabled={spamPending}
                                                        onSelect={(event) => {
                                                                event.preventDefault();
                                                                void runAction(
                                                                        async () => {
                                                                                if (isSpam) {
                                                                                        await markNotSpam();
                                                                                        return;
                                                                                }
                                                                                await markSpam();
                                                                        },
                                                                        spamSuccessMessage
                                                                );
                                                        }}
                                                        shortcuts={["P"]}
                                                >
                                                        {spamLabel}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                        disabled={!canToggleBlock || blockPending}
                                                        onSelect={(event) => {
                                                                event.preventDefault();
                                                                void runAction(
                                                                        async () => {
                                                                                if (!visitorId) {
                                                                                        return false;
                                                                                }
                                                                                if (isBlocked) {
                                                                                        await unblockVisitor();
                                                                                        return true;
                                                                                }
                                                                                await blockVisitor();
                                                                                return true;
                                                                        },
                                                                        blockSuccessMessage
                                                                );
                                                        }}
                                                >
                                                        {blockLabel}
                                                </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                                onSelect={(event) => {
                                                        event.preventDefault();
                                                        void runAction(
                                                                async () => {
                                                                        return handleCopyId();
                                                                },
                                                                "Conversation ID copied"
                                                        );
                                                }}
                                        >
                                                Copy conversation ID
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                                onSelect={(event) => {
                                                        event.preventDefault();
                                                        void runAction(
                                                                async () => {
                                                                        return handleCopyUrl();
                                                                },
                                                                "Conversation link copied"
                                                        );
                                                }}
                                        >
                                                Copy conversation URL
                                        </DropdownMenuItem>
                                </DropdownMenuContent>
                        </DropdownMenu>
                </div>
        );
}
