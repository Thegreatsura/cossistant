import "./support.css";

import type { DefaultMessage } from "@cossistant/types";
import * as React from "react";
import * as Primitive from "../primitives";
import { useSupport } from "../provider";
import { SupportRealtimeProvider } from "../realtime";
import { SupportConfig } from "../support-config";
import { Content } from "./components/content";
import { Root } from "./components/root";
import { ThemeWrapper } from "./components/theme-wrapper";
import { DefaultTrigger } from "./components/trigger";
import { type CustomPage, Page, Router } from "./router";
import { initializeSupportStore } from "./store/support-store";
import type { SupportLocale, SupportTextContentOverrides } from "./text";
import { SupportTextProvider } from "./text";
import type { Align, Side, TriggerRenderProps } from "./types";

// =============================================================================
// Support Props
// =============================================================================

export type SupportProps<Locale extends string = SupportLocale> = {
	/**
	 * Additional CSS classes for the root wrapper.
	 */
	className?: string;

	/**
	 * Which side of the trigger to place the content.
	 * @default "top"
	 */
	side?: Side;

	/**
	 * Alignment along the side axis.
	 * @default "end"
	 */
	align?: Align;

	/**
	 * Distance (in pixels) between the trigger and the content.
	 * @default 16
	 */
	sideOffset?: number;

	/**
	 * Granular className overrides for specific parts.
	 */
	classNames?: {
		trigger?: string;
		content?: string;
	};

	/**
	 * Force a specific theme. Omit for automatic detection.
	 */
	theme?: "light" | "dark";

	/**
	 * Whether the widget should open automatically on mount.
	 * @default false
	 */
	defaultOpen?: boolean;

	/**
	 * Quick reply options displayed to users.
	 */
	quickOptions?: string[];

	/**
	 * Custom welcome messages shown before a conversation starts.
	 */
	defaultMessages?: DefaultMessage[];

	/**
	 * Locale string for widget translations.
	 */
	locale?: Locale;

	/**
	 * Custom text content overrides for internationalization.
	 */
	content?: SupportTextContentOverrides<Locale>;

	/**
	 * Custom pages to add to the router.
	 */
	customPages?: CustomPage[];

	/**
	 * Children for composition. Can include:
	 * - <Support.Trigger> for custom trigger
	 * - <Support.Content> for custom content positioning
	 * - <Support.Page> components for custom routes
	 */
	children?: React.ReactNode;
};

// =============================================================================
// Child Component Detection
// =============================================================================

type ParsedChildren = {
	trigger: React.ReactNode | null;
	content: React.ReactNode | null;
	pages: React.ReactNode[];
	other: React.ReactNode[];
};

function parseChildren(children: React.ReactNode): ParsedChildren {
	const result: ParsedChildren = {
		trigger: null,
		content: null,
		pages: [],
		other: [],
	};

	React.Children.forEach(children, (child) => {
		if (!React.isValidElement(child)) {
			result.other.push(child);
			return;
		}

		// Check component type by displayName or the component reference
		const displayName = (child.type as React.ComponentType)?.displayName ?? "";

		if (displayName === "Support.Trigger" || child.type === SupportTrigger) {
			result.trigger = child;
		} else if (
			displayName === "Support.Content" ||
			child.type === SupportContent
		) {
			result.content = child;
		} else if (displayName === "Support.Page" || child.type === Page) {
			result.pages.push(child);
		} else {
			result.other.push(child);
		}
	});

	return result;
}

// =============================================================================
// Main Support Component
// =============================================================================

/**
 * Complete support widget with chat, routing, and real-time features.
 *
 * @example
 * // Zero config - works instantly
 * <Support />
 *
 * @example
 * // With styling
 * <Support
 *   theme="dark"
 *   classNames={{
 *     trigger: "bg-purple-600",
 *     content: "border-purple-200",
 *   }}
 * />
 *
 * @example
 * // With custom positioning
 * <Support side="bottom" align="end" sideOffset={8} />
 *
 * @example
 * // With custom trigger
 * <Support side="bottom" align="end">
 *   <Support.Trigger className="px-4 py-2">
 *     {({ isOpen, unreadCount }) => (
 *       <span>{isOpen ? "Close" : `Help (${unreadCount})`}</span>
 *     )}
 *   </Support.Trigger>
 * </Support>
 *
 * @example
 * // With custom pages
 * <Support>
 *   <Support.Page name="FAQ" component={FAQPage} />
 * </Support>
 */
function SupportComponent<Locale extends string = SupportLocale>({
	className,
	side = "top",
	align = "end",
	sideOffset = 16,
	classNames = {},
	theme,
	defaultOpen,
	quickOptions,
	defaultMessages,
	locale,
	content,
	customPages,
	children,
}: SupportProps<Locale>): React.ReactElement | null {
	const { website } = useSupport();
	const isVisitorBlocked = website?.visitor?.isBlocked ?? false;

	React.useEffect(() => {
		if (defaultOpen !== undefined) {
			initializeSupportStore({ defaultOpen });
		}
	}, [defaultOpen]);

	if (!website || isVisitorBlocked) {
		return null;
	}

	// Parse children to detect custom components
	const parsed = parseChildren(children);

	// Determine which components to render
	const triggerElement = parsed.trigger ?? (
		<DefaultTrigger className={classNames.trigger} />
	);

	// If custom content is provided, use it; otherwise create default
	const contentElement = parsed.content ?? (
		<Content
			align={align}
			className={classNames.content}
			side={side}
			sideOffset={sideOffset}
		>
			<Router customPages={customPages}>{parsed.pages}</Router>
		</Content>
	);

	return (
		<ThemeWrapper theme={theme}>
			<SupportRealtimeProvider>
				<SupportTextProvider content={content} locale={locale}>
					<Root className={className}>
						{triggerElement}
						{contentElement}
					</Root>
				</SupportTextProvider>
			</SupportRealtimeProvider>
			<SupportConfig
				defaultMessages={defaultMessages}
				quickOptions={quickOptions}
			/>
		</ThemeWrapper>
	);
}

// =============================================================================
// Trigger Compound Component
// =============================================================================

export type SupportTriggerProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"children"
> & {
	/**
	 * Content to render inside the trigger.
	 * Can be static content or a function receiving render props.
	 */
	children?: React.ReactNode | ((props: TriggerRenderProps) => React.ReactNode);
	/**
	 * When true, renders children directly with all props passed through.
	 */
	asChild?: boolean;
	className?: string;
};

/**
 * Custom trigger component for the support widget.
 * Use this inside <Support> to replace the default floating button.
 *
 * @example
 * <Support.Trigger className="my-button">
 *   {({ isOpen, unreadCount }) => (
 *     <span>{isOpen ? "Close" : `Help (${unreadCount})`}</span>
 *   )}
 * </Support.Trigger>
 */
const SupportTrigger = React.forwardRef<HTMLButtonElement, SupportTriggerProps>(
	({ children, className, asChild = false, ...props }, ref) => (
		<Primitive.Trigger
			asChild={asChild}
			className={className}
			ref={ref}
			{...props}
		>
			{children}
		</Primitive.Trigger>
	)
);

SupportTrigger.displayName = "Support.Trigger";

// =============================================================================
// Content Compound Component
// =============================================================================

export type SupportContentProps = {
	className?: string;
	/**
	 * Which side of the trigger to place the content.
	 * @default "top"
	 */
	side?: Side;
	/**
	 * Alignment along the side axis.
	 * @default "end"
	 */
	align?: Align;
	/**
	 * Distance (in pixels) between the trigger and the content.
	 * @default 16
	 */
	sideOffset?: number;
	children?: React.ReactNode;
};

/**
 * Custom content wrapper for the support widget.
 * Use this inside <Support> for custom positioning or styling.
 *
 * @example
 * <Support>
 *   <Support.Trigger>Help</Support.Trigger>
 *   <Support.Content side="bottom" align="end" className="my-content">
 *     <Support.Router />
 *   </Support.Content>
 * </Support>
 */
const SupportContent: React.FC<SupportContentProps> = ({
	className,
	side = "top",
	align = "end",
	sideOffset = 16,
	children,
}) => (
	<Content
		align={align}
		className={className}
		side={side}
		sideOffset={sideOffset}
	>
		{children ?? <Router />}
	</Content>
);

(SupportContent as React.FC & { displayName?: string }).displayName =
	"Support.Content";

// =============================================================================
// Router Compound Component
// =============================================================================

export type SupportRouterProps = {
	/**
	 * Custom pages to add alongside built-in pages.
	 */
	customPages?: CustomPage[];
	/**
	 * Page components to register.
	 */
	children?: React.ReactNode;
};

/**
 * Router with all default pages (Home, Conversation, etc.).
 * Use inside <Support.Content> for full control.
 *
 * @example
 * <Support.Content>
 *   <Support.Router />
 * </Support.Content>
 *
 * @example
 * // With custom pages
 * <Support.Router>
 *   <Support.Page name="FAQ" component={FAQPage} />
 * </Support.Router>
 */
const SupportRouter: React.FC<SupportRouterProps> = ({
	customPages,
	children,
}) => <Router customPages={customPages}>{children}</Router>;

(SupportRouter as React.FC & { displayName?: string }).displayName =
	"Support.Router";

// =============================================================================
// Page Compound Component
// =============================================================================

export type SupportPageProps<
	K extends
		keyof import("@cossistant/core").RouteRegistry = keyof import("@cossistant/core").RouteRegistry,
> = {
	name: K;
	component: React.ComponentType<{
		params?: import("@cossistant/core").RouteRegistry[K];
	}>;
};

/**
 * Declarative page registration for custom routes.
 *
 * @example
 * <Support>
 *   <Support.Page name="FAQ" component={FAQPage} />
 *   <Support.Page name="SETTINGS" component={SettingsPage} />
 * </Support>
 */
const SupportPage = Page;

(SupportPage as unknown as { displayName?: string }).displayName =
	"Support.Page";

// =============================================================================
// Root Compound Component (for full composition)
// =============================================================================

export type SupportRootProps = {
	/**
	 * Whether the widget should open automatically.
	 * @default false
	 */
	defaultOpen?: boolean;
	/**
	 * Force a specific theme.
	 */
	theme?: "light" | "dark";
	/**
	 * Additional CSS classes.
	 */
	className?: string;
	children: React.ReactNode;
};

/**
 * Root component for full composition mode.
 * Use when you need complete control over the widget structure.
 *
 * @example
 * <Support.Root defaultOpen={false}>
 *   <Support.Trigger asChild>
 *     <button>Help</button>
 *   </Support.Trigger>
 *   <Support.Content side="bottom" align="end">
 *     <Support.Router />
 *   </Support.Content>
 * </Support.Root>
 */
const SupportRoot: React.FC<SupportRootProps> = ({
	defaultOpen,
	theme,
	className,
	children,
}) => {
	const { website } = useSupport();
	const isVisitorBlocked = website?.visitor?.isBlocked ?? false;

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
				<Root className={className}>{children}</Root>
			</SupportRealtimeProvider>
		</ThemeWrapper>
	);
};

(SupportRoot as React.FC & { displayName?: string }).displayName =
	"Support.Root";

// =============================================================================
// Compound Component Assembly
// =============================================================================

export const Support = Object.assign(SupportComponent, {
	Root: SupportRoot,
	Trigger: SupportTrigger,
	Content: SupportContent,
	Router: SupportRouter,
	Page: SupportPage,
});

export default Support;

// =============================================================================
// Type Exports
// =============================================================================

export type {
	DefaultRoutes,
	NavigationState,
	RouteRegistry,
	SupportPage as SupportPageType,
} from "@cossistant/core";
// Custom page type
export type { CustomPage } from "./router";
// Types from ./types.ts
export type {
	Align,
	ContentProps,
	RootProps,
	Side,
	TriggerRenderProps,
} from "./types";

// =============================================================================
// Component Exports
// =============================================================================

export { CoButton as Button } from "./components/button";
export { Header } from "./components/header";

// =============================================================================
// Hook Exports
// =============================================================================

export type { WebSocketContextValue } from "./context/websocket";
export { useWebSocket, WebSocketProvider } from "./context/websocket";
export {
	useSupportConfig,
	useSupportNavigation,
	useSupportStore,
} from "./store";

// =============================================================================
// Text & Localization
// =============================================================================

export type { SupportLocale, SupportTextContentOverrides } from "./text";
export { Text, useSupportText } from "./text";
