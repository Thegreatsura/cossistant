import { ConversationStatus } from "@cossistant/types";
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
	status,
	visitorIsBlocked,
	deletedAt,
}: {
	className?: string;
	conversationId: string;
	visitorId?: string | null;
	status?: ConversationStatus;
	visitorIsBlocked?: boolean | null;
	deletedAt?: string | null;
}) {
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
							onSelect={async (event) => {
								event.preventDefault();
								if (isResolved) {
									await markOpen();
									return;
								}
								await markResolved();
							}}
							shortcuts={["R"]}
						>
							{resolveLabel}
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={archivePending}
							onSelect={async (event) => {
								event.preventDefault();
								if (isArchived) {
									await markUnarchived();
									return;
								}
								await markArchived();
							}}
							shortcuts={["Delete"]}
						>
							{archiveLabel}
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
							disabled={spamPending}
							onSelect={async (event) => {
								event.preventDefault();
								if (isSpam) {
									await markNotSpam();
									return;
								}
								await markSpam();
							}}
							shortcuts={["P"]}
						>
							{spamLabel}
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={!canToggleBlock || blockPending}
							onSelect={async (event) => {
								event.preventDefault();
								if (!visitorId) {
									return;
								}
								if (isBlocked) {
									await unblockVisitor();
									return;
								}
								await blockVisitor();
							}}
						>
							{blockLabel}
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
