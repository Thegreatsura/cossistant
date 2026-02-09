import type { ToolTimelineLogType } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import { Logo } from "@/components/ui/logo";
import { getToolTimelineLogType } from "@/lib/tool-timeline-visibility";
import { cn } from "@/lib/utils";

type ToolCallMode = "default" | "developer";

type ToolTimelinePart = {
	type: string;
	toolCallId: string;
	toolName: string;
	input: Record<string, unknown>;
	state: "partial" | "result" | "error";
	output?: unknown;
	errorText?: string;
};

type LooseToolTimelinePart = {
	type: string;
	toolCallId?: string;
	toolName?: string;
	input?: unknown;
	state?: ToolTimelinePart["state"];
	output?: unknown;
	errorText?: string;
};

type NormalizedToolCall = {
	toolCallId: string;
	toolName: string;
	input: unknown;
	state: ToolTimelinePart["state"];
	output?: unknown;
	errorText?: string;
	summaryText: string;
	logType: ToolTimelineLogType;
	isFallback: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolState(value: unknown): value is ToolTimelinePart["state"] {
	return value === "partial" || value === "result" || value === "error";
}

function isToolTimelinePart(part: unknown): part is ToolTimelinePart {
	if (!isRecord(part)) {
		return false;
	}

	return (
		typeof part.type === "string" &&
		part.type.startsWith("tool-") &&
		typeof part.toolCallId === "string" &&
		typeof part.toolName === "string" &&
		isRecord(part.input) &&
		isToolState(part.state)
	);
}

function extractToolPart(item: TimelineItem): ToolTimelinePart | null {
	for (const part of item.parts) {
		if (isToolTimelinePart(part)) {
			return part;
		}
	}

	return null;
}

function extractLooseToolPart(
	item: TimelineItem
): LooseToolTimelinePart | null {
	for (const part of item.parts) {
		if (!isRecord(part)) {
			continue;
		}

		if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
			continue;
		}

		const partRecord = part as Record<string, unknown>;

		return {
			type: part.type,
			toolCallId:
				typeof partRecord.toolCallId === "string"
					? partRecord.toolCallId
					: undefined,
			toolName:
				typeof partRecord.toolName === "string"
					? partRecord.toolName
					: undefined,
			input: partRecord.input,
			state: isToolState(partRecord.state) ? partRecord.state : undefined,
			output: partRecord.output,
			errorText:
				typeof partRecord.errorText === "string"
					? partRecord.errorText
					: undefined,
		};
	}

	return null;
}

function getFallbackSummary(
	toolName: string,
	state: ToolTimelinePart["state"]
): string {
	if (state === "partial") {
		return `Running ${toolName}`;
	}

	if (state === "result") {
		return `Completed ${toolName}`;
	}

	return `Failed ${toolName}`;
}

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

function formatTimestamp(createdAt: string): string {
	return new Date(createdAt).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function buildNormalizedToolCall(
	item: TimelineItem,
	strictPart: ToolTimelinePart | null
): NormalizedToolCall {
	const loosePart = strictPart ? null : extractLooseToolPart(item);
	const toolName =
		strictPart?.toolName ??
		loosePart?.toolName ??
		(typeof item.tool === "string" && item.tool.length > 0
			? item.tool
			: "unknown_tool");
	const state = strictPart?.state ?? loosePart?.state ?? "partial";
	const summaryText =
		typeof item.text === "string" && item.text.trim().length > 0
			? item.text
			: getFallbackSummary(toolName, state);

	return {
		toolCallId:
			strictPart?.toolCallId ??
			loosePart?.toolCallId ??
			item.id ??
			"unknown-call",
		toolName,
		input: strictPart?.input ?? loosePart?.input ?? {},
		state,
		output: strictPart?.output ?? loosePart?.output,
		errorText: strictPart?.errorText ?? loosePart?.errorText,
		summaryText,
		logType: getToolTimelineLogType(item),
		isFallback: !strictPart,
	};
}

const stateConfig: Record<
	ToolTimelinePart["state"],
	{ label: string; className: string }
> = {
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

function StatusBadge({ state }: { state: ToolTimelinePart["state"] }) {
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

export function ToolCall({
	item,
	mode = "default",
}: {
	item: TimelineItem;
	mode?: ToolCallMode;
}) {
	const strictPart = extractToolPart(item);
	if (!strictPart && mode !== "developer") {
		return null;
	}

	const toolCall = buildNormalizedToolCall(item, strictPart);
	const timestamp = formatTimestamp(item.createdAt);

	if (mode === "developer") {
		return (
			<div className="flex w-full gap-2">
				<div className="flex size-8 shrink-0 items-center justify-center">
					<Logo className="size-6 text-primary/90" />
				</div>
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
								{toolCall.state === "result" &&
								toolCall.output !== undefined ? (
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

	return (
		<div className="rounded-lg border border-border/60 bg-muted/30 p-3">
			<div className="flex items-center gap-2 text-xs">
				<span className="font-semibold text-foreground">
					{toolCall.summaryText}
				</span>
				<StatusBadge state={toolCall.state} />
				<time className="text-muted-foreground">{timestamp}</time>
			</div>
			<div className="mt-1 text-[11px] text-muted-foreground">
				Tool: <span className="font-mono">{toolCall.toolName}</span>
			</div>

			<details className="group mt-2">
				<summary className="cursor-pointer text-[11px] text-muted-foreground transition-colors hover:text-foreground">
					Debug details
				</summary>
				<div className="mt-2 space-y-2">
					<div className="text-[11px] text-muted-foreground">
						Call ID: <span className="font-mono">{toolCall.toolCallId}</span>
					</div>
					<DebugBlock label="Input" value={toolCall.input} />
					{toolCall.state === "result" && toolCall.output !== undefined ? (
						<DebugBlock label="Output" value={toolCall.output} />
					) : null}
					{toolCall.state === "error" && toolCall.errorText ? (
						<DebugBlock label="Error" value={toolCall.errorText} />
					) : null}
				</div>
			</details>
		</div>
	);
}
