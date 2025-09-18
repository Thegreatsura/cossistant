/**
 * Utilities for collecting visitor data including browser, device, and location information
 * Moved from packages/react for better separation of concerns
 */
/** biome-ignore-all lint/complexity/useOptionalChain: ok */

type VisitorData = {
	browser: string | null;
	browserVersion: string | null;
	os: string | null;
	osVersion: string | null;
	device: string | null;
	deviceType: "desktop" | "mobile" | "tablet" | "unknown";
	language: string;
	timezone: string;
	screenResolution: string;
	viewport: string;
};

// Browser detection patterns
const EDGE_PATTERN = /Edg\/([0-9.]+)/;
const CHROME_PATTERN = /Chrome\/([0-9.]+)/;
const SAFARI_PATTERN = /Version\/([0-9.]+).*Safari/;
const FIREFOX_PATTERN = /Firefox\/([0-9.]+)/;
const OPERA_PATTERN = /OPR\/([0-9.]+)/;

/**
 * Parse user agent to extract browser information
 */
function parseBrowser(userAgent: string): {
	browser: string | null;
	version: string | null;
} {
	const browsers = [
		{ name: "Edge", pattern: EDGE_PATTERN },
		{ name: "Chrome", pattern: CHROME_PATTERN },
		{ name: "Safari", pattern: SAFARI_PATTERN },
		{ name: "Firefox", pattern: FIREFOX_PATTERN },
		{ name: "Opera", pattern: OPERA_PATTERN },
	];

	for (const { name, pattern } of browsers) {
		const match = userAgent.match(pattern);
		if (match) {
			return { browser: name, version: match[1] || null };
		}
	}

	return { browser: null, version: null };
}

// OS detection patterns
const WINDOWS_PATTERN = /Windows NT ([0-9.]+)/;
const MACOS_PATTERN = /Mac OS X ([0-9_]+)/;
const IOS_PATTERN = /OS ([0-9_]+) like Mac OS X/;
const ANDROID_PATTERN = /Android ([0-9.]+)/;
const LINUX_PATTERN = /Linux/;

const WINDOWS_VERSION_MAP: Record<string, string> = {
	"10.0": "10",
	"6.3": "8.1",
	"6.2": "8",
	"6.1": "7",
};

/**
 * Transform version string by replacing underscores with dots
 */
function transformVersion(version: string): string {
	return version.replace(/_/g, ".");
}

/**
 * Parse user agent to extract OS information
 */
function parseOS(userAgent: string): {
	os: string | null;
	version: string | null;
} {
	// Check Windows
	const windowsMatch = userAgent.match(WINDOWS_PATTERN);
	if (windowsMatch) {
		const rawVersion = windowsMatch[1];
		let version: string | null = null;
		if (rawVersion) {
			version = WINDOWS_VERSION_MAP[rawVersion] || rawVersion;
		}
		return { os: "Windows", version };
	}

	// Check macOS
	const macMatch = userAgent.match(MACOS_PATTERN);
	if (macMatch) {
		const version = macMatch[1] ? transformVersion(macMatch[1]) : null;
		return { os: "macOS", version };
	}

	// Check iOS
	const iosMatch = userAgent.match(IOS_PATTERN);
	if (iosMatch) {
		const version = iosMatch[1] ? transformVersion(iosMatch[1]) : null;
		return { os: "iOS", version };
	}

	// Check Android
	const androidMatch = userAgent.match(ANDROID_PATTERN);
	if (androidMatch) {
		return { os: "Android", version: androidMatch[1] || null };
	}

	// Check Linux
	if (LINUX_PATTERN.test(userAgent)) {
		return { os: "Linux", version: null };
	}

	return { os: null, version: null };
}

// Device type detection patterns
const MOBILE_PATTERN = /Mobile|Android|iPhone|iPod/i;
const TABLET_PATTERN = /iPad|Tablet|Tab/i;

// Device name detection patterns
const IPHONE_PATTERN = /iPhone/;
const IPAD_PATTERN = /iPad/;
const IPOD_PATTERN = /iPod/;
const ANDROID_MOBILE_PATTERN = /Android.*Mobile/;
const ANDROID_TABLET_PATTERN = /Android.*Tablet/;
const WINDOWS_PHONE_PATTERN = /Windows Phone/;
const MACINTOSH_PATTERN = /Macintosh/;
const WINDOWS_PATTERN_DEVICE = /Windows/;
const LINUX_PATTERN_DEVICE = /Linux/;

/**
 * Detect device type from user agent
 */
function detectDeviceType(
	userAgent: string
): "desktop" | "mobile" | "tablet" | "unknown" {
	const isMobile = MOBILE_PATTERN.test(userAgent);
	const isTablet = TABLET_PATTERN.test(userAgent);

	if (isTablet) {
		return "tablet";
	}
	if (isMobile) {
		return "mobile";
	}
	if (
		userAgent.includes("Windows") ||
		userAgent.includes("Mac") ||
		userAgent.includes("Linux")
	) {
		return "desktop";
	}

	return "unknown";
}

/**
 * Get device name from user agent
 */
function getDeviceName(userAgent: string): string | null {
	const devices = [
		{ pattern: IPHONE_PATTERN, name: "iPhone" },
		{ pattern: IPAD_PATTERN, name: "iPad" },
		{ pattern: IPOD_PATTERN, name: "iPod" },
		{ pattern: ANDROID_MOBILE_PATTERN, name: "Android Phone" },
		{ pattern: ANDROID_TABLET_PATTERN, name: "Android Tablet" },
		{ pattern: WINDOWS_PHONE_PATTERN, name: "Windows Phone" },
		{ pattern: MACINTOSH_PATTERN, name: "Mac" },
		{ pattern: WINDOWS_PATTERN_DEVICE, name: "Windows PC" },
		{ pattern: LINUX_PATTERN_DEVICE, name: "Linux PC" },
	];

	for (const { pattern, name } of devices) {
		if (pattern.test(userAgent)) {
			return name;
		}
	}

	return null;
}

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
	return typeof window !== "undefined" && typeof navigator !== "undefined";
}

/**
 * Collect visitor data from the browser environment
 * Returns null if not in browser environment
 */
export function collectVisitorData(): VisitorData | null {
	if (!isBrowser()) {
		return null;
	}

	const userAgent = navigator.userAgent || "";
	const { browser, version: browserVersion } = parseBrowser(userAgent);
	const { os, version: osVersion } = parseOS(userAgent);

	return {
		browser,
		browserVersion,
		os,
		osVersion,
		device: getDeviceName(userAgent),
		deviceType: detectDeviceType(userAgent),
		language: navigator.language || "en-US",
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		screenResolution:
			typeof window !== "undefined" && window.screen
				? `${window.screen.width}x${window.screen.height}`
				: "unknown",
		viewport:
			typeof window !== "undefined"
				? `${window.innerWidth}x${window.innerHeight}`
				: "unknown",
	};
}

/**
 * Export the interface for use by consumers
 */
export type { VisitorData };
