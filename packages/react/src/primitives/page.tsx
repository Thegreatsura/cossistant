import { useRegisterPage } from "./page-registry";

export type PageProps<Params = unknown> = {
	name: string;
	component: React.ComponentType<{ params?: Params }>;
};

/**
 * Declaratively register a page in a router.
 * Works with any router that uses the page registry system.
 *
 * @example
 * <PageRegistryProvider>
 *   <Page name="HOME" component={HomePage} />
 *   <Page name="SETTINGS" component={SettingsPage} />
 *   <Router page={currentPage} params={params} />
 * </PageRegistryProvider>
 */
export function Page<Params = unknown>({
	name,
	component,
}: PageProps<Params>): null {
	useRegisterPage(name, component as React.ComponentType<{ params?: unknown }>);
	return null;
}
