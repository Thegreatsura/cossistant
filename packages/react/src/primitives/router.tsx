import type React from "react";
import { usePageRegistry } from "./page-registry";

export type RouterProps = {
	/**
	 * Current page name to render
	 */
	page: string;

	/**
	 * Params to pass to the page component
	 */
	params?: unknown;

	/**
	 * Fallback component when page is not found
	 */
	fallback?: React.ComponentType<{ params?: unknown }>;

	/**
	 * Children (Page components for registration)
	 */
	children?: React.ReactNode;
};

/**
 * Router that renders registered pages based on current page name.
 *
 * @example
 * <Router page={currentPage} params={params} fallback={NotFoundPage}>
 *   <Page name="HOME" component={HomePage} />
 * </Router>
 */
export const Router: React.FC<RouterProps> = ({
	page,
	params,
	fallback: Fallback,
	children,
}) => {
	const registry = usePageRegistry();

	// Render children first (they register pages via useEffect)
	// Page components return null, so this is effectively a no-op render

	// Get the page component from registry
	const PageComponent = registry.get(page);

	if (PageComponent) {
		return (
			<>
				{children}
				<PageComponent params={params} />
			</>
		);
	}

	// Fall back if provided
	if (Fallback) {
		return (
			<>
				{children}
				<Fallback params={params} />
			</>
		);
	}

	return <>{children}</>;
};
