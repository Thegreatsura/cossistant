import type { RouteRegistry } from "@cossistant/core";
import type React from "react";
import type { PageDefinition } from "../primitives";
import * as Primitive from "../primitives";
import { ArticlesPage } from "./pages/articles";
import { ConversationPage } from "./pages/conversation";
import { ConversationHistoryPage } from "./pages/conversation-history";
import { HomePage } from "./pages/home";
import { useSupportNavigation } from "./store/support-store";

// Type for custom pages that ensures they match RouteRegistry
export type CustomPage<K extends keyof RouteRegistry = keyof RouteRegistry> = {
	name: K;
	component: React.ComponentType<{ params?: RouteRegistry[K] }>;
};

export type SupportRouterProps = {
	customPages?: CustomPage[];
	children?: React.ReactNode;
};

/**
 * Router with default support pages (HOME, ARTICLES, CONVERSATION, CONVERSATION_HISTORY).
 * Add custom pages via customPages prop.
 *
 * @example
 * <SupportRouter
 *   customPages={[
 *     { name: "SETTINGS", component: SettingsPage }
 *   ]}
 * />
 */
export const SupportRouter: React.FC<SupportRouterProps> = ({
	customPages = [],
	children,
}) => {
	const { current } = useSupportNavigation();

	// Define all pages with proper typing
	const builtInPages = [
		{
			name: "HOME",
			component: HomePage,
		},
		{
			name: "ARTICLES",
			component: ArticlesPage,
		},
		{
			name: "CONVERSATION",
			component: ConversationPage,
		},
		{
			name: "CONVERSATION_HISTORY",
			component: ConversationHistoryPage,
		},
	] as PageDefinition<keyof RouteRegistry>[];

	// Combine built-in and custom pages
	const allPages = [...builtInPages, ...customPages] as PageDefinition<
		keyof RouteRegistry
	>[];

	return (
		<>
			{children}
			<Primitive.Router
				fallback={HomePage as React.ComponentType<{ params?: unknown }>}
				page={current.page}
				pages={allPages}
				params={current.params}
			/>
		</>
	);
};
