import { ConversationStatus } from "@cossistant/types";
import type React from "react";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { useConversationActionRunner } from "./use-conversation-action-runner";
import { cn } from "@/lib/utils";

export function ConversationBasicActions({
	className,
	conversationId,
	visitorId,
	status,
	deletedAt,
}: {
	className?: string;
	conversationId: string;
	visitorId?: string | null;
	status?: ConversationStatus;
	deletedAt?: string | null;
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
                () => (isResolved ? "Mark unresolved" : "Mark resolved"),
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
                () => (isArchived ? "Unarchive" : "Archive"),
                [isArchived]
        );
        const archiveSuccessMessage = useMemo(
                () =>
                        isArchived
                                ? "Conversation unarchived"
                                : "Conversation archived",
                [isArchived]
        );
        const archiveErrorMessage = "Failed to update archive status";
        const archiveIcon = isArchived ? "cancel" : "archive";

        const resolvePending = isResolved
                ? pendingAction.markOpen
                : pendingAction.markResolved;

        const handleResolve = useCallback(
                (event: React.MouseEvent<HTMLButtonElement>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void runAction(
                                () =>
                                        isResolved
                                                ? markOpen()
                                                : markResolved(),
                                {
                                        successMessage: resolveSuccessMessage,
                                        errorMessage: resolveErrorMessage,
                                }
                        );
                },
                [
                        isResolved,
                        markOpen,
                        markResolved,
                        resolveErrorMessage,
                        resolveSuccessMessage,
                        runAction,
                ]
        );

        const handleArchive = useCallback(
                (event: React.MouseEvent<HTMLButtonElement>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void runAction(
                                () =>
                                        isArchived
                                                ? markUnarchived()
                                                : markArchived(),
                                {
                                        successMessage: archiveSuccessMessage,
                                        errorMessage: archiveErrorMessage,
                                }
                        );
                },
                [
                        archiveErrorMessage,
                        archiveSuccessMessage,
                        isArchived,
                        markArchived,
                        markUnarchived,
                        runAction,
                ]
        );

	return (
		<div className={cn("flex items-center gap-2 pr-1", className)}>
			{!isArchived && (
				<TooltipOnHover content={resolveLabel} shortcuts={["R"]}>
					<Button
						disabled={resolvePending}
						onClick={handleResolve}
						size="icon-small"
						variant="ghost"
					>
						<Icon filledOnHover name={resolveIcon} />
					</Button>
				</TooltipOnHover>
			)}
			<TooltipOnHover content={archiveLabel} shortcuts={["Delete"]}>
				<Button
					disabled={
						isArchived
							? pendingAction.markUnarchived
							: pendingAction.markArchived
					}
					onClick={handleArchive}
					size="icon-small"
					variant="ghost"
				>
					<Icon filledOnHover name={archiveIcon} />
				</Button>
			</TooltipOnHover>
		</div>
	);
}
