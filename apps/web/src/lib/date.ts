import {
	differenceInDays,
	differenceInHours,
	format,
	isToday,
	isYesterday,
} from "date-fns";

export function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diffHours = differenceInHours(now, date);
	const diffDays = differenceInDays(now, date);

	// For times less than 24 hours ago, show the actual time
	if (diffHours < 24) {
		// Detect user's locale to determine 12-hour vs 24-hour format
		const userLocale = navigator.language || "en-US";

		// Check if the locale uses 12-hour format (primarily US, Canada, Australia, etc.)
		const uses12HourFormat = new Intl.DateTimeFormat(userLocale, {
			hour: "numeric",
		}).resolvedOptions().hour12;

		// Format the time based on user's locale preference
		const timeFormat = uses12HourFormat ? "h:mm a" : "HH:mm";

		if (isToday(date)) {
			return format(date, timeFormat);
		}

		return format(date, timeFormat);
	}

	if (diffDays < 7) {
		return `${diffDays}d`;
	}

	if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7);
		return weeks === 1 ? "1w" : `${weeks}w`;
	}

	// For older dates, show the actual date
	const currentYear = now.getFullYear();
	const dateYear = date.getFullYear();

	if (dateYear === currentYear) {
		return format(date, "MMM d");
	}
	return format(date, "MMM d, yyyy");
}
