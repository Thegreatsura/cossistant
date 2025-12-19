import "./support.css";

import type { DefaultMessage } from "@cossistant/types";
import React, { type ReactElement } from "react";
import { useSupport } from "../provider";
import { SupportRealtimeProvider } from "../realtime";
import { SupportConfig } from "../support-config";
import { SupportContent } from "./components/support-content";
import { ThemeWrapper } from "./components/theme-wrapper";
import type { CustomPage } from "./router";
import { initializeSupportStore } from "./store/support-store";
import type { SupportLocale, SupportTextContentOverrides } from "./text";
import { SupportTextProvider } from "./text";
import type {
	BubbleSlotProps,
	ContainerSlotProps,
	RouterSlotProps,
} from "./types";

export type SupportProps<Locale extends string = SupportLocale> = {
	// Existing props
	className?: string;
	position?: "top" | "bottom";
	align?: "right" | "left";
	positioning?: "fixed" | "absolute" | "relative";
	quickOptions?: string[];
	defaultMessages?: DefaultMessage[];
	defaultOpen?: boolean;
	locale?: Locale;
	content?: SupportTextContentOverrides<Locale>;

	// NEW: Theme control
	theme?: "light" | "dark";

	// NEW: Slot customization
	slots?: {
		bubble?: React.ComponentType<BubbleSlotProps>;
		container?: React.ComponentType<ContainerSlotProps>;
		router?: React.ComponentType<RouterSlotProps>;
	};

	// NEW: Granular className overrides
	classNames?: {
		root?: string;
		bubble?: string;
		container?: string;
	};

	// NEW: Type-safe custom pages
	customPages?: CustomPage[];

	children?: React.ReactNode;
};

/**
 * Complete support widget with chat, routing, and real-time features.
 *
 * @example
 * // Zero config
 * <Support />
 *
 * @example
 * // With customization and custom pages
 * <Support
 *   theme="dark"
 *   classNames={{ bubble: "bg-purple-600" }}
 *   customPages={[
 *     { name: "FAQ", component: FAQPage }
 *   ]}
 * />
 */
export function Support<Locale extends string = SupportLocale>({
	className,
	position = "bottom",
	align = "right",
	positioning = "fixed",
	quickOptions,
	defaultMessages,
	defaultOpen,
	locale,
	content,
	theme,
	slots,
	classNames,
	customPages,
	children,
}: SupportProps<Locale>): ReactElement | null {
	const { website } = useSupport();
	const isVisitorBlocked = website?.visitor?.isBlocked ?? false;

	// Initialize support store with defaultOpen when component mounts or prop changes
	React.useEffect(() => {
		if (defaultOpen !== undefined) {
			initializeSupportStore({ defaultOpen });
		}
	}, [defaultOpen]);

	if (!website || isVisitorBlocked) {
		return null;
	}

	return (
		<ThemeWrapper theme={theme}>
			<SupportRealtimeProvider>
				<SupportTextProvider content={content} locale={locale}>
					<SupportContent
						align={align}
						className={className}
						classNames={classNames}
						customPages={customPages}
						position={position}
						positioning={positioning}
						slots={slots}
					>
						{children}
					</SupportContent>
				</SupportTextProvider>
			</SupportRealtimeProvider>
			<SupportConfig
				defaultMessages={defaultMessages}
				quickOptions={quickOptions}
			/>
		</ThemeWrapper>
	);
}

export default Support;

// Type exports from core
export type {
	DefaultRoutes,
	NavigationState,
	RouteRegistry,
	SupportPage,
} from "@cossistant/core";
export { CoButton as Button } from "./components/button";
// UI components for building custom pages
export { Header } from "./components/header";
// WebSocket context
export type { WebSocketContextValue } from "./context/websocket";
export { useWebSocket, WebSocketProvider } from "./context/websocket";
// Custom page type for type-safe routing
export type { CustomPage } from "./router";
// Navigation hooks and store
export {
	useSupportConfig,
	useSupportNavigation,
	useSupportStore,
} from "./store";
// Text and localization
export type { SupportLocale, SupportTextContentOverrides } from "./text";
export { Text, useSupportText } from "./text";

// Slot prop types
export type {
	BubbleSlotProps,
	ContainerSlotProps,
	RouterSlotProps,
} from "./types";
