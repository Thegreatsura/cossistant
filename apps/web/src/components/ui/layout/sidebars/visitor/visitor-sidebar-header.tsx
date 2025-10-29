import type { RouterOutputs } from "@api/trpc/types";
import type { VisitorPresenceEntry } from "@cossistant/types";
import { Avatar } from "@/components/ui/avatar";

export type VisitorSidebarHeaderProps = {
	fullName: string;
	email?: string | null;
	avatarUrl?: string | null;
	lastSeenAt?: string | null;
	status?: VisitorPresenceEntry["status"];
	contact?: RouterOutputs["conversation"]["getVisitorById"]["contact"];
};

export function VisitorSidebarHeader({
	fullName,
	email,
	avatarUrl,
	lastSeenAt,
	status,
	contact,
}: VisitorSidebarHeaderProps) {
	return (
		<div className="flex h-10 w-full items-center justify-between px-2">
			<div className="flex items-center gap-3">
				<Avatar
					fallbackName={fullName}
					lastOnlineAt={lastSeenAt}
					status={status}
					url={avatarUrl}
					withBoringAvatar
				/>
				<div className="flex flex-col gap-0">
					<p className="font-medium text-sm">{fullName}</p>
					{contact ? (
						<p className="text-muted-foreground text-xs">{email}</p>
					) : (
						<p className="text-primary/50 text-xs decoration-dashed underline-offset-2">
							Not identified yet
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
