import { motion } from "motion/react";
import type React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ToolCallState } from "./types";

export type ActivityIcon =
	| { type: "logo" }
	| { type: "spinner" }
	| { type: "avatar"; name: string; image?: string | null };

function ActivityIconRenderer({ icon }: { icon: ActivityIcon }) {
	switch (icon.type) {
		case "spinner":
			return (
				<div className="flex size-7 shrink-0 items-center justify-center">
					<Spinner className="size-5" size={20} />
				</div>
			);
		case "avatar":
			return (
				<Avatar
					className="size-7 shrink-0 overflow-clip"
					fallbackName={icon.name}
					url={icon.image}
				/>
			);
		default:
			return (
				<div className="flex size-7 shrink-0 items-center justify-center">
					<Logo className="size-5 text-primary/90" />
				</div>
			);
	}
}

function resolveIcon(
	icon: ActivityIcon | undefined,
	state?: ToolCallState
): ActivityIcon {
	if (icon) {
		return icon;
	}
	if (state === "partial") {
		return { type: "spinner" };
	}
	return { type: "logo" };
}

export function ActivityWrapper({
	state,
	text,
	timestamp,
	icon,
	className,
	children,
}: {
	state: ToolCallState;
	text: React.ReactNode;
	timestamp: string;
	icon?: ActivityIcon;
	className?: string;
	children?: React.ReactNode;
}) {
	const isError = state === "error";
	const resolvedIcon = resolveIcon(icon, state);

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className={cn("group/activity flex w-full gap-2", className)}
			initial={{ opacity: 0, y: 6 }}
			transition={{ duration: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
		>
			<ActivityIconRenderer icon={resolvedIcon} />
			<div className="flex min-w-0 flex-1 flex-col">
				<div
					className={cn(
						"flex min-h-7 items-center gap-2 text-muted-foreground text-sm",
						isError && "text-destructive/70"
					)}
				>
					<span>{text}</span>
					<time className="text-[10px] opacity-0 transition-opacity group-hover/activity:opacity-100">
						{timestamp}
					</time>
				</div>
				{children}
			</div>
		</motion.div>
	);
}
