import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

export type TypingParticipantType = "visitor" | "team_member" | "ai";

export type TypingParticipant = {
	id: string;
	name: string;
	type: TypingParticipantType;
	avatarUrl?: string | null;
	preview?: string | null;
};

export type TypingIndicatorProps = React.HTMLAttributes<HTMLDivElement> & {
	participants: TypingParticipant[];
};

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

function formatTypingText(participants: TypingParticipant[]): string {
	const names = participants.map(
		(participant) => participant.name || "Someone"
	);

	if (names.length === 0) {
		return "Someone is typing...";
	}

	if (names.length === 1) {
		return `${names[0]} is typing...`;
	}

	if (names.length === 2) {
		return `${names[0]} and ${names[1]} are typing...`;
	}

	const [first, second, ...rest] = names;
	return `${first}, ${second}, and ${rest.length} others are typing...`;
}

function getPreview(participants: TypingParticipant[]): string | null {
	for (const participant of participants) {
		if (participant.preview && participant.preview.trim().length > 0) {
			return participant.preview.trim();
		}
	}
	return null;
}

export const TypingIndicator = React.forwardRef<
	HTMLDivElement,
	TypingIndicatorProps
>(({ participants, className, ...props }, ref) => {
	if (!participants || participants.length === 0) {
		return null;
	}

	const text = formatTypingText(participants);
	const preview = getPreview(participants);
	const avatars = participants.slice(0, 3);

	return (
		<div className={cn("flex items-end gap-2", className)} ref={ref} {...props}>
			<div className="-space-x-2 flex">
				{avatars.map((participant) => (
					<Avatar
						className="size-8 border-2 border-white bg-co-background-200 dark:border-co-background-900 dark:bg-co-background-300"
						key={participant.id}
					>
						{participant.avatarUrl ? (
							<AvatarImage alt={participant.name} src={participant.avatarUrl} />
						) : null}
						<AvatarFallback
							className="font-medium text-co-foreground text-xs"
							name={participant.name}
						/>
					</Avatar>
				))}
			</div>
			<div className="flex flex-col gap-1">
				<div className="rounded-lg bg-co-background-200 px-3 py-2 shadow-sm dark:bg-co-background-500/60">
					<p className="font-medium text-co-foreground/80 text-xs">{text}</p>
					<div className="mt-2 flex items-center gap-1">
						<span className="animation-delay-0 size-1.5 animate-bounce rounded-full bg-primary" />
						<span className="animation-delay-200 size-1.5 animate-bounce rounded-full bg-primary" />
						<span className="animation-delay-400 size-1.5 animate-bounce rounded-full bg-primary" />
					</div>
					{preview ? (
						<p className="mt-2 line-clamp-2 text-co-foreground/90 text-sm">
							{preview}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
});

TypingIndicator.displayName = "TypingIndicator";
