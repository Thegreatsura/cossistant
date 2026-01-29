"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			className="toaster group"
			icons={{
				loading: <Spinner size={16} squareSize={2} squaresPerSide={3} />,
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "1px",
				} as React.CSSProperties
			}
			theme={theme as ToasterProps["theme"]}
			toastOptions={{
				...(toastOptions ?? {}),
				className: cn(
					"border-dashed px-2 py-1.5 text-sm",
					toastOptions?.className
				),
			}}
			{...props}
		/>
	);
};

export { Toaster };
