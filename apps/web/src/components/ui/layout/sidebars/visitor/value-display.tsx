import { formatInTimeZone } from "date-fns-tz";
import { ExternalLink } from "lucide-react";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MetadataValueType = string | number | boolean | null;

type Props = {
	title: string;
	value: string | React.ReactNode | null | undefined;
	placeholder?: string;
	tooltip?: string;
	className?: string;
	autoFormat?: boolean;
};

// Regex patterns defined at top level for performance
const CAMEL_CASE_PATTERN = /([A-Z])/g;
const ISO_DATE_PATTERN =
	/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const FIRST_CHAR_PATTERN = /^./;
const URL_PATTERN = /^https?:\/\//i;

/**
 * Converts a camelCase string to title case with spaces.
 * e.g., "userName" → "User name", "createdAt" → "Created at"
 */
function formatCamelCaseToTitle(key: string): string {
	return key
		.replaceAll(CAMEL_CASE_PATTERN, " $1")
		.toLowerCase()
		.trim()
		.replace(FIRST_CHAR_PATTERN, (char) => char.toUpperCase());
}

/**
 * Checks if a string is a valid ISO date string.
 */
function isISODateString(value: string): boolean {
	if (!ISO_DATE_PATTERN.test(value)) {
		return false;
	}

	const date = new Date(value);
	return !Number.isNaN(date.getTime());
}

/**
 * Checks if a string is a valid URL.
 */
function isURL(value: string): boolean {
	return URL_PATTERN.test(value);
}

type FormattedDate = {
	display: React.ReactNode;
	tooltip: string;
};

/**
 * Formats a date with timezone offset.
 * Returns display value and tooltip separately.
 */
function formatDateWithTimezone(date: Date): FormattedDate {
	const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	const formattedDate = formatInTimeZone(date, userTimezone, "MMM d, yyyy");
	const formattedTime = formatInTimeZone(date, userTimezone, "h:mma");

	// Get GMT offset
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: userTimezone,
		timeZoneName: "shortOffset",
	});
	const parts = formatter.formatToParts(date);
	const offsetPart = parts.find((part) => part.type === "timeZoneName");
	const gmtOffset = offsetPart?.value ?? "GMT";

	return {
		display: (
			<>
				{formattedDate} {formattedTime.toLowerCase()}
			</>
		),
		tooltip: gmtOffset,
	};
}

type FormattedMetadataValue = {
	display: React.ReactNode;
	tooltip?: string;
};

/**
 * Formats a metadata value with appropriate formatting based on type.
 * Returns display value and optional tooltip.
 */
function formatMetadataValue(value: MetadataValueType): FormattedMetadataValue {
	if (value === null) {
		return {
			display: (
				<Badge className="ml-auto rounded-[2px] px-1" variant="secondary">
					null
				</Badge>
			),
		};
	}

	if (typeof value === "boolean") {
		return {
			display: (
				<Badge className="ml-auto rounded-[2px] px-1" variant="secondary">
					{value ? "true" : "false"}
				</Badge>
			),
		};
	}

	if (typeof value === "number") {
		return {
			display: (
				<Badge
					className="ml-auto min-w-[20px] rounded-[2px] px-1"
					variant="secondary"
				>
					{value}
				</Badge>
			),
		};
	}

	// String value - check if it's a date
	if (isISODateString(value)) {
		const formatted = formatDateWithTimezone(new Date(value));
		return {
			display: formatted.display,
			tooltip: formatted.tooltip,
		};
	}

	// String value - check if it's a URL
	if (isURL(value)) {
		return {
			display: (
				<span className="inline-flex items-center gap-1.5">
					<Button asChild className="h-6 px-1.5" size="xs" variant="secondary">
						<a
							className="inline-flex items-center justify-center rounded p-0.5 text-primary/60 transition-colors hover:bg-secondary hover:text-primary"
							href={value}
							rel="noopener noreferrer"
							target="_blank"
						>
							<span className="max-w-[180px] truncate">{value}</span>
						</a>
					</Button>
				</span>
			),
			tooltip: value,
		};
	}

	// Regular string
	return { display: value };
}

export function ValueDisplay({
	title,
	value,
	placeholder,
	tooltip,
	className,
	autoFormat,
}: Props) {
	const displayTitle = autoFormat ? formatCamelCaseToTitle(title) : title;

	const formattedValue = autoFormat
		? formatMetadataValue(value as MetadataValueType)
		: null;

	const displayValue = autoFormat
		? formattedValue?.display
		: typeof value === "string"
			? value
			: value || placeholder;

	const displayTooltip = autoFormat ? formattedValue?.tooltip : tooltip;

	const hasValue = autoFormat
		? value !== null && value !== undefined
		: Boolean(value);

	return (
		<TooltipOnHover content={displayTooltip} side="left">
			<div className={cn("flex items-center justify-between gap-4", className)}>
				<p className="text-primary/60 text-xs capitalize">{displayTitle}</p>
				<p
					className={cn(
						"flex-1 text-right text-xs",
						hasValue ? "text-primary" : "text-primary/40"
					)}
				>
					{displayValue}
				</p>
			</div>
		</TooltipOnHover>
	);
}
