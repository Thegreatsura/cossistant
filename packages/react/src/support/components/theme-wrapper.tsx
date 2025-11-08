import type React from "react";

type ThemeWrapperProps = {
	theme?: "light" | "dark";
	children: React.ReactNode;
};

/**
 * Wraps children with theme data attribute when dark mode is explicitly requested.
 * When theme is undefined or "light", children are rendered directly to allow
 * automatic theme detection from parent elements.
 */
export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({
	theme,
	children,
}) => {
	if (theme === "dark") {
		return <div data-color-scheme="dark">{children}</div>;
	}

	// Light or undefined - render children directly to inherit theme from parent
	return <>{children}</>;
};
