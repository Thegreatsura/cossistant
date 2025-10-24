"use client";

/** biome-ignore-all lint/correctness/useExhaustiveDependencies: ok */
import { ConversationStatus } from "@cossistant/types";
import type React from "react";
import { useCallback, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useConversationActionRunner } from "./use-conversation-action-runner";

export function ConversationBasicActions({
        className,
        conversationId,
        visitorId,
        status,
        deletedAt,
        enableKeyboardShortcuts = false,
}: {
        className?: string;
        conversationId: string;
        visitorId?: string | null;
        status?: ConversationStatus;
        deletedAt?: string | null;
        enableKeyboardShortcuts?: boolean;
}) {
	const {
		markResolved,
		markOpen,
		markArchived,
		markUnarchived,
		pendingAction,
		runAction,
	} = useConversationActionRunner({
		conversationId,
		visitorId,
	});

	const isResolved = status === ConversationStatus.RESOLVED;
        const resolveLabel = useMemo(
                () =>
                        isResolved
                                ? "Mark conversation unresolved"
                                : "Mark conversation resolved",
                [isResolved]
        );
	const resolveSuccessMessage = useMemo(
		() =>
			isResolved
				? "Conversation marked unresolved"
				: "Conversation marked resolved",
		[isResolved]
	);
	const resolveErrorMessage = "Failed to update resolution status";
	const resolveIcon = isResolved ? "cancel" : "check";

	const isArchived = deletedAt !== null;
        const archiveLabel = useMemo(
                () =>
                        isArchived
                                ? "Unarchive conversation"
                                : "Archive conversation",
                [isArchived]
        );
	const archiveSuccessMessage = useMemo(
		() => (isArchived ? "Conversation unarchived" : "Conversation archived"),
		[isArchived]
	);
	const archiveErrorMessage = "Failed to update archive status";
	const archiveIcon = isArchived ? "cancel" : "archive";

	const resolvePending = isResolved
		? pendingAction.markOpen
		: pendingAction.markResolved;

        const archivePending = isArchived
                ? pendingAction.markUnarchived
                : pendingAction.markArchived;

        const runResolveAction = useCallback(() => {
                if (resolvePending || isArchived) {
                        return;
                }
                void runAction(() => (isResolved ? markOpen() : markResolved()), {
                        successMessage: resolveSuccessMessage,
                        errorMessage: resolveErrorMessage,
                });
        }, [
                isArchived,
                isResolved,
                markOpen,
                markResolved,
                resolveErrorMessage,
                resolvePending,
                resolveSuccessMessage,
                runAction,
        ]);

        const handleResolve = useCallback(
                (event: React.MouseEvent<HTMLButtonElement>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        runResolveAction();
                },
                [runResolveAction]
        );

        const runArchiveAction = useCallback(() => {
                if (archivePending) {
                        return;
                }
                void runAction(() => (isArchived ? markUnarchived() : markArchived()), {
                        successMessage: archiveSuccessMessage,
                        errorMessage: archiveErrorMessage,
                });
        }, [
                archiveErrorMessage,
                archivePending,
                archiveSuccessMessage,
                isArchived,
                markArchived,
                markUnarchived,
                runAction,
        ]);

        const handleArchive = useCallback(
                (event: React.MouseEvent<HTMLButtonElement>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        runArchiveAction();
                },
                [runArchiveAction]
        );

        const resolveShortcutsEnabled = enableKeyboardShortcuts && !isArchived;
        const archiveShortcutsEnabled = enableKeyboardShortcuts;

        useHotkeys(
                "r",
                (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        runResolveAction();
                },
                {
                        enabled: resolveShortcutsEnabled,
                        enableOnFormTags: false,
                        enableOnContentEditable: false,
                },
                [resolveShortcutsEnabled, runResolveAction]
        );

        useHotkeys(
                ["Backspace", "Delete"],
                (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        runArchiveAction();
                },
                {
                        enabled: archiveShortcutsEnabled,
                        enableOnFormTags: false,
                        enableOnContentEditable: false,
                },
                [archiveShortcutsEnabled, runArchiveAction]
        );

        return (
                <div className={cn("flex items-center gap-2 pr-1", className)}>
                        {!isArchived && (
                                <TooltipOnHover content={resolveLabel} shortcuts={["R"]}>
                                        <Button
                                                disabled={resolvePending}
                                                onClick={handleResolve}
                                                aria-label={resolveLabel}
                                                size="icon-small"
                                                variant="ghost"
                                                type="button"
                                        >
                                                <Icon filledOnHover name={resolveIcon} />
                                        </Button>
                                </TooltipOnHover>
                        )}
                        <TooltipOnHover
                                content={archiveLabel}
                                shortcuts={["Backspace", "Delete"]}
                        >
                                <Button
                                        disabled={archivePending}
                                        onClick={handleArchive}
                                        aria-label={archiveLabel}
                                        size="icon-small"
                                        variant="ghost"
                                        type="button"
                                >
                                        <Icon filledOnHover name={archiveIcon} />
                                </Button>
			</TooltipOnHover>
		</div>
	);
}
