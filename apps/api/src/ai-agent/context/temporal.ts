/**
 * Temporal Context
 *
 * Provides time-aware context for AI personalization.
 */

/**
 * Temporal context for the current moment
 */
export type TemporalContext = {
	currentTime: string;
	currentDate: string;
	visitorLocalTime: string | null;
	greeting: string;
	dayOfWeek: string;
};

/**
 * Get a time-appropriate greeting
 */
function getGreeting(hour: number): string {
	if (hour < 12) {
		return "Good morning";
	}
	if (hour < 17) {
		return "Good afternoon";
	}
	return "Good evening";
}

/**
 * Format time in 12-hour format
 */
function formatTime(date: Date): string {
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

/**
 * Format date in readable format
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/**
 * Get the day of week
 */
function getDayOfWeek(date: Date): string {
	return date.toLocaleDateString("en-US", { weekday: "long" });
}

/**
 * Get temporal context for the current moment
 */
export function getTemporalContext(
	visitorTimezone: string | null
): TemporalContext {
	const now = new Date();

	// Get visitor's local time if timezone is known
	let visitorLocalTime: string | null = null;
	let visitorHour = now.getHours();

	if (visitorTimezone) {
		try {
			const visitorDate = new Date(
				now.toLocaleString("en-US", { timeZone: visitorTimezone })
			);
			visitorLocalTime = formatTime(visitorDate);
			visitorHour = visitorDate.getHours();
		} catch {
			// Invalid timezone, fall back to server time
			visitorLocalTime = null;
		}
	}

	return {
		currentTime: formatTime(now),
		currentDate: formatDate(now),
		visitorLocalTime,
		greeting: getGreeting(visitorHour),
		dayOfWeek: getDayOfWeek(now),
	};
}

/**
 * Format temporal context for inclusion in prompt
 */
export function formatTemporalContextForPrompt(
	context: TemporalContext
): string {
	const timePart = context.visitorLocalTime
		? `It's currently **${context.visitorLocalTime}** for them (${context.greeting}).`
		: `Current time: **${context.currentTime}** (${context.greeting}).`;

	return `${timePart}
Today is **${context.dayOfWeek}**, ${context.currentDate}.`;
}
