import { ConversationStatus } from "@cossistant/types";
import type React from "react";
import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { useConversationActions } from "@/data/use-conversation-actions";
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
  } = useConversationActions({
    conversationId,
    visitorId,
  });

  const isResolved = status === ConversationStatus.RESOLVED;
  const resolveLabel = useMemo(
    () => (isResolved ? "Mark unresolved" : "Mark resolved"),
    [isResolved]
  );
  const resolveIcon = isResolved ? "cancel" : "check";

  const isArchived = deletedAt !== null;
  const archiveLabel = useMemo(
    () => (isArchived ? "Unarchive" : "Archive"),
    [isArchived]
  );
  const archiveIcon = isArchived ? "cancel" : "archive";

  const resolvePending = isResolved
    ? pendingAction.markOpen
    : pendingAction.markResolved;

  const handleResolve = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (isResolved) {
        await markOpen();
        return;
      }
      await markResolved();
    },
    [isResolved, markOpen, markResolved]
  );

  const handleArchive = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (isArchived) {
        await markUnarchived();
        return;
      }

      await markArchived();
    },
    [isArchived, markArchived, markUnarchived]
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
