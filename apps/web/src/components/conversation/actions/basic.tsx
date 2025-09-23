import type React from "react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { useConversationActions } from "@/data/use-conversation-actions";
import { cn } from "@/lib/utils";

export function ConversationBasicActions({
	className,
	conversationId,
	visitorId,
}: {
	className?: string;
	conversationId: string;
	visitorId?: string | null;
}) {
	const { markResolved, markArchived, pendingAction } = useConversationActions({
		conversationId,
		visitorId,
	});

	const handleResolve = useCallback(
		async (event: React.MouseEvent<HTMLButtonElement>) => {
			event.preventDefault();
			event.stopPropagation();
			await markResolved();
		},
		[markResolved]
	);

	const handleArchive = useCallback(
		async (event: React.MouseEvent<HTMLButtonElement>) => {
			event.preventDefault();
			event.stopPropagation();
			await markArchived();
		},
		[markArchived]
	);

	return (
		<div className={cn("flex items-center gap-2 pr-1", className)}>
			<TooltipOnHover content="Mark as resolved" shortcuts={["R"]}>
				<Button
					disabled={pendingAction.markResolved}
					onClick={handleResolve}
					size="icon-small"
					variant="ghost"
				>
					<Icon filledOnHover name="check" />
				</Button>
			</TooltipOnHover>
			<TooltipOnHover content="Mark as archived" shortcuts={["Delete"]}>
				<Button
					disabled={pendingAction.markArchived}
					onClick={handleArchive}
					size="icon-small"
					variant="ghost"
				>
					<Icon filledOnHover name="archive" />
				</Button>
			</TooltipOnHover>
		</div>
	);
}
