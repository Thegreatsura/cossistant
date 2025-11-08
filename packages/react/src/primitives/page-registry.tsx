import React, { createContext, useContext, useMemo } from "react";

type PageComponent<P = unknown> = React.ComponentType<{ params?: P }>;

type PageRegistry = Map<string, PageComponent>;

const PageRegistryContext = createContext<PageRegistry>(new Map());

/**
 * Context provider for declarative page registration.
 *
 * @example
 * <PageRegistryProvider>
 *   <Page name="HOME" component={HomePage} />
 *   <Router page={currentPage} />
 * </PageRegistryProvider>
 */
export const PageRegistryProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const registry = useMemo(() => new Map<string, PageComponent>(), []);

	return (
		<PageRegistryContext.Provider value={registry}>
			{children}
		</PageRegistryContext.Provider>
	);
};

/**
 * Access the page registry (used internally by Router and Page).
 */
export const usePageRegistry = () => useContext(PageRegistryContext);

/**
 * Register a page in the registry (used internally by Page component).
 */
export const useRegisterPage = (name: string, component: PageComponent) => {
	const registry = usePageRegistry();

	React.useEffect(() => {
		registry.set(name, component);
		return () => {
			registry.delete(name);
		};
	}, [name, component, registry]);
};
