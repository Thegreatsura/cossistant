import {
        differenceInDays,
        differenceInHours,
        differenceInMinutes,
        differenceInMonths,
        differenceInYears,
        format,
        isAfter,
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

export function getWaitingSinceLabel(from: Date, now: Date = new Date()): string {
        if (isAfter(from, now)) {
                return "<1m";
        }

        const minutes = differenceInMinutes(now, from);

        if (minutes < 1) {
                return "<1m";
        }

        if (minutes < 60) {
                return `${minutes}m`;
        }

        const hours = differenceInHours(now, from);

        if (hours < 24) {
                return `${hours}h`;
        }

        const days = differenceInDays(now, from);

        if (days < 7) {
                return `${days}d`;
        }

        const weeks = Math.max(1, Math.floor(days / 7));

        if (weeks < 5) {
                return `${weeks}w`;
        }

        const months = Math.max(1, differenceInMonths(now, from));

        if (months < 12) {
                return `${months}mo`;
        }

        const years = Math.max(1, differenceInYears(now, from));

        return `${years}y`;
}
