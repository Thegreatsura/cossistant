import "./support.css";

import type { DefaultMessage } from "@cossistant/types";
import React, { type ReactElement } from "react";
import { useSupport } from "../provider";
import { SupportRealtimeProvider } from "../realtime";
import { SupportConfig } from "../support-config";
import { SupportContent } from "./components/support-content";
import type { SupportLocale, SupportTextContentOverrides } from "./text";
import { SupportTextProvider } from "./text";

export type SupportProps<Locale extends string = SupportLocale> = {
	className?: string;
	position?: "top" | "bottom";
	align?: "right" | "left";
	quickOptions?: string[];
	defaultMessages?: DefaultMessage[];
	locale?: Locale;
	content?: SupportTextContentOverrides<Locale>;
};

// Internal component that needs the conversation context
/**
 * Orchestrates the end-user support experience by nesting realtime and
 * content providers. Renders nothing until website data is available to avoid
 * flashing incomplete UI.
 */
export function Support<Locale extends string = SupportLocale>({
	className,
	position = "bottom",
	align = "right",
	quickOptions,
	defaultMessages,
	locale,
	content,
}: SupportProps<Locale>): ReactElement | null {
	const { website } = useSupport();
	const isVisitorBlocked = website?.visitor?.isBlocked ?? false;

	if (!website || isVisitorBlocked) {
		return null;
	}

	return (
		<>
			<SupportRealtimeProvider>
				<SupportTextProvider content={content} locale={locale}>
					<SupportContent
						align={align}
						className={className}
						position={position}
					/>
				</SupportTextProvider>
			</SupportRealtimeProvider>
			<SupportConfig
				defaultMessages={defaultMessages}
				quickOptions={quickOptions}
			/>
		</>
	);
}

export default Support;

export type { WebSocketContextValue } from "./context/websocket";
export { useWebSocket, WebSocketProvider } from "./context/websocket";
// Export the store for direct access if needed
export {
	useSupportConfig,
	useSupportNavigation,
	useSupportStore,
} from "./store";
export type { SupportLocale, SupportTextContentOverrides } from "./text";
export { Text, useSupportText } from "./text";
