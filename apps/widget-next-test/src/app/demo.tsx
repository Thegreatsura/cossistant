"use client";

import { useTheme } from "next-themes";

export const CossistantDemo = () => {
	const { setTheme, resolvedTheme } = useTheme();

	return (
		<div className="flex max-w-sm flex-col gap-4">
			<h3 className="font-bold text-2xl">Cossistant Demo</h3>
			<p>
				The only purpose of this page is to test and live code the Support
				widget in a Next.js app.
			</p>
			<button
				className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
				onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
				type="button"
			>
				Toggle {resolvedTheme === "dark" ? "Light" : "Dark"} Mode
			</button>
		</div>
	);
};
