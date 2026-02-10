import type { ToolTimelineLogType } from "@cossistant/types";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ActivityIcon } from "../activity-wrapper";
import type {
	NormalizedToolCall,
	ToolActivityProps,
	ToolCallState,
} from "../types";

function safeJson(value: unknown): string {
	try {
		const serialized = JSON.stringify(value, null, 2);
		if (!serialized) {
			return "{}";
		}
		if (serialized.length <= 4000) {
			return serialized;
		}
		return `${serialized.slice(0, 4000)}\n... [truncated]`;
	} catch {
		return "[unserializable value]";
	}
}

const stateConfig: Record<ToolCallState, { label: string; className: string }> =
	{
		partial: {
			label: "Running",
			className:
				"border-amber-300/70 bg-amber-100/70 text-amber-900 dark:border-amber-700/70 dark:bg-amber-900/30 dark:text-amber-100",
		},
		result: {
			label: "Success",
			className:
				"border-emerald-300/70 bg-emerald-100/70 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-900/30 dark:text-emerald-100",
		},
		error: {
			label: "Error",
			className:
				"border-red-300/70 bg-red-100/70 text-red-900 dark:border-red-700/70 dark:bg-red-900/30 dark:text-red-100",
		},
	};

const logTypeConfig: Record<
	ToolTimelineLogType,
	{ label: string; className: string }
> = {
	customer_facing: {
		label: "Customer",
		className:
			"border-sky-300/70 bg-sky-100/70 text-sky-900 dark:border-sky-700/70 dark:bg-sky-900/30 dark:text-sky-100",
	},
	log: {
		label: "Log",
		className:
			"border-zinc-300/70 bg-zinc-100/70 text-zinc-900 dark:border-zinc-700/70 dark:bg-zinc-900/30 dark:text-zinc-100",
	},
	decision: {
		label: "Decision",
		className:
			"border-blue-300/70 bg-blue-100/70 text-blue-900 dark:border-blue-700/70 dark:bg-blue-900/30 dark:text-blue-100",
	},
};

function DebugBlock({
	label,
	value,
	preClassName,
}: {
	label: string;
	value: unknown;
	preClassName?: string;
}) {
	return (
		<div className="space-y-1">
			<div className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
				{label}
			</div>
			<pre
				className={cn(
					"max-h-56 overflow-auto rounded-md border border-border/50 bg-background/70 p-2 text-[11px] leading-relaxed",
					preClassName
				)}
			>
				{safeJson(value)}
			</pre>
		</div>
	);
}

function StatusBadge({ state }: { state: ToolCallState }) {
	const config = stateConfig[state];
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium",
				config.className
			)}
		>
			{config.label}
		</span>
	);
}

function LogTypeBadge({ logType }: { logType: ToolTimelineLogType }) {
	const config = logTypeConfig[logType];
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md border px-1.5 py-0.5 font-medium",
				config.className
			)}
		>
			{config.label}
		</span>
	);
}

function resolveIcon(icon: ActivityIcon | undefined): ActivityIcon {
	if (icon) {
		return icon;
	}
	return { type: "logo" };
}

function IconRenderer({ icon }: { icon: ActivityIcon | undefined }) {
	const resolvedIcon = resolveIcon(icon);

	switch (resolvedIcon.type) {
		case "spinner":
			return (
				<div className="flex size-6 shrink-0 items-center justify-center">
					<Spinner className="size-5" size={20} />
				</div>
			);
		case "avatar":
			return (
				<Avatar
					className="size-6 shrink-0 overflow-clip"
					fallbackName={resolvedIcon.name}
					url={resolvedIcon.image}
				/>
			);
		case "icon": {
			const Icon = resolvedIcon.Icon as LucideIcon;
			return (
				<div className="flex size-6 shrink-0 items-center justify-center">
					<Icon
						aria-hidden
						className="size-4 text-muted-foreground"
						data-activity-icon={resolvedIcon.iconKey}
					/>
				</div>
			);
		}
		default:
			return (
				<div className="flex size-6 shrink-0 items-center justify-center">
					<Logo className="size-5 text-primary/90" />
				</div>
			);
	}
}

export function DeveloperToolView({
	toolCall,
	timestamp,
	showIcon = true,
	icon,
}: ToolActivityProps) {
	return (
		<div className={cn("flex w-full", showIcon ? "gap-2" : "gap-0")}>
			{showIcon ? <IconRenderer icon={icon} /> : null}
			<div className="flex min-w-0 flex-1 flex-col gap-1 pb-1.5">
				<div className="px-1 text-muted-foreground text-xs">
					AI agent dev log
				</div>
				<div className="rounded-lg border border-primary/20 bg-background-200/60 p-3">
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<span className="font-semibold text-foreground">
							{toolCall.summaryText}
						</span>
						<StatusBadge state={toolCall.state} />
						<LogTypeBadge logType={toolCall.logType} />
						<time className="ml-auto text-muted-foreground">{timestamp}</time>
					</div>

					<div className="mt-2 rounded-md border border-border/60 bg-background/80 p-2 font-mono text-[11px] leading-relaxed">
						<div>
							<span className="text-muted-foreground">tool</span>:{" "}
							{toolCall.toolName}
						</div>
						<div>
							<span className="text-muted-foreground">call</span>:{" "}
							{toolCall.toolCallId}
						</div>
					</div>

					{toolCall.isFallback ? (
						<div className="mt-2 text-[11px] text-muted-foreground">
							Fallback rendered from timeline metadata.
						</div>
					) : null}

					<details className="group mt-2">
						<summary className="cursor-pointer font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground">
							Dev payload
						</summary>
						<div className="mt-2 space-y-2">
							<DebugBlock
								label="Input"
								preClassName="bg-background/90 font-mono"
								value={toolCall.input}
							/>
							{toolCall.state === "result" && toolCall.output !== undefined ? (
								<DebugBlock
									label="Output"
									preClassName="bg-background/90 font-mono"
									value={toolCall.output}
								/>
							) : null}
							{toolCall.state === "error" && toolCall.errorText ? (
								<DebugBlock
									label="Error"
									preClassName="bg-background/90 font-mono"
									value={toolCall.errorText}
								/>
							) : null}
						</div>
					</details>
				</div>
			</div>
		</div>
	);
}
