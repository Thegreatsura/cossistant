import { useCallback } from "react";
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
}: {
	className?: string;
	conversationId: string;
	visitorId?: string | null;
}) {
	const {
		markResolved,
		markArchived,
		markRead,
		markUnread,
		markSpam,
		blockVisitor,
		pendingAction,
	} = useConversationActions({ conversationId, visitorId });

	const handleCopyId = useCallback(async () => {
		try {
			if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
				return;
			}
			await navigator.clipboard.writeText(conversationId);
		} catch (error) {
			console.error("Failed to copy conversation id", error);
		}
	}, [conversationId]);

	const handleCopyUrl = useCallback(async () => {
		try {
			if (typeof window === "undefined" || !navigator.clipboard?.writeText) {
				return;
			}
			await navigator.clipboard.writeText(window.location.href);
		} catch (error) {
			console.error("Failed to copy conversation URL", error);
		}
	}, []);

	return (
		<div className={cn("flex items-center gap-2 pr-1", className)}>
			<DropdownMenu>
				<TooltipOnHover content="More options">
					<DropdownMenuTrigger asChild>
						<Button size="icon-small" variant="ghost">
							<Icon filledOnHover name="more" />
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
							disabled={pendingAction.markResolved}
							onSelect={async (event) => {
								event.preventDefault();
								await markResolved();
							}}
							shortcuts={["R"]}
						>
							Mark resolved
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={pendingAction.markArchived}
							onSelect={async (event) => {
								event.preventDefault();
								await markArchived();
							}}
							shortcuts={["Delete"]}
						>
							Mark archived
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={pendingAction.markRead}
							onSelect={async (event) => {
								event.preventDefault();
								await markRead();
							}}
							shortcuts={["U"]}
						>
							Mark as read
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={pendingAction.markUnread}
							onSelect={async (event) => {
								event.preventDefault();
								await markUnread();
							}}
						>
							Mark as unread
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={pendingAction.markSpam}
							onSelect={async (event) => {
								event.preventDefault();
								await markSpam();
							}}
							shortcuts={["P"]}
						>
							Mark spam
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={!visitorId || pendingAction.blockVisitor}
							onSelect={async (event) => {
								event.preventDefault();
								if (!visitorId) {
									return;
								}
								await blockVisitor();
							}}
						>
							Block visitor
						</DropdownMenuItem>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={async (event) => {
							event.preventDefault();
							await handleCopyId();
						}}
					>
						Copy conversation ID
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={async (event) => {
							event.preventDefault();
							await handleCopyUrl();
						}}
					>
						Copy conversation URL
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
