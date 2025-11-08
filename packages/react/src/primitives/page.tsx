import { useRegisterPage } from "./page-registry";

export type PageProps<Params = unknown> = {
	name: string;
	component: React.ComponentType<{ params?: Params }>;
};

/**
 * Declaratively register a page component.
 *
 * @example
 * <Page name="HOME" component={HomePage} />
 * <Page name="SETTINGS" component={SettingsPage} />
 */
export function Page<Params = unknown>({
	name,
	component,
}: PageProps<Params>): null {
	useRegisterPage(name, component as React.ComponentType<{ params?: unknown }>);
	return null;
}
