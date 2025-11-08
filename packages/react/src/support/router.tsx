import type React from "react";
import * as Primitive from "../primitives";
import { ArticlesPage } from "./pages/articles";
import { ConversationPage } from "./pages/conversation";
import { ConversationHistoryPage } from "./pages/conversation-history";
import { HomePage } from "./pages/home";
import { useSupportNavigation } from "./store/support-store";

/**
 * Support-specific router that includes default pages.
 * Uses the primitive Router under the hood with declarative Page registration.
 *
 * Custom pages can be added as children:
 * @example
 * <SupportRouter>
 *   <Page name="SETTINGS" component={SettingsPage} />
 * </SupportRouter>
 */
export const SupportRouter: React.FC<{ children?: React.ReactNode }> = ({
	children,
}) => {
	const { current } = useSupportNavigation();

	return (
		<>
			{/* Register default pages */}
			<Primitive.Page
				component={HomePage as React.ComponentType<{ params?: unknown }>}
				name="HOME"
			/>
			<Primitive.Page
				component={ArticlesPage as React.ComponentType<{ params?: unknown }>}
				name="ARTICLES"
			/>
			<Primitive.Page
				component={
					ConversationPage as React.ComponentType<{ params?: unknown }>
				}
				name="CONVERSATION"
			/>
			<Primitive.Page
				component={
					ConversationHistoryPage as React.ComponentType<{ params?: unknown }>
				}
				name="CONVERSATION_HISTORY"
			/>

			{/* Allow custom pages via children */}
			{children}

			{/* Render using primitive router */}
			<Primitive.Router
				fallback={HomePage as React.ComponentType<{ params?: unknown }>}
				page={current.page as string}
				params={current.params}
			/>
		</>
	);
};
