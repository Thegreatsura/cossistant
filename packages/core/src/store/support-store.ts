import { createStore, type Store } from "./create-store";

export type NavigationState =
        | { page: "HOME"; params?: undefined }
        | { page: "ARTICLES"; params?: undefined }
        | {
                        page: "CONVERSATION";
                        params: { conversationId: string; initialMessage?: string };
          }
        | { page: "CONVERSATION_HISTORY"; params?: undefined };

export type SUPPORT_PAGES = NavigationState["page"];

export type SupportNavigation = {
        previousPages: NavigationState[];
        current: NavigationState;
};

export type SupportConfig = {
        mode: "floating" | "responsive";
        size: "normal" | "larger";
        isOpen: boolean;
        content: {
                home?: {
                        header?: string;
                        subheader?: string;
                        ctaLabel?: string;
                };
        };
};

export type SupportStoreState = {
        navigation: SupportNavigation;
        config: SupportConfig;
};

export type SupportStoreActions = {
        navigate(state: NavigationState): void;
        replace(state: NavigationState): void;
        goBack(): void;
        open(): void;
        close(): void;
        toggle(): void;
        updateConfig(config: Partial<SupportConfig>): void;
        reset(): void;
};

export type SupportStoreStorage = {
        getItem(key: string): string | null;
        setItem(key: string, value: string): void;
        removeItem(key: string): void;
};

export type SupportStoreOptions = {
        storage?: SupportStoreStorage;
        storageKey?: string;
};

export type SupportStore = Store<SupportStoreState> & SupportStoreActions;

const STORAGE_KEY = "cossistant-support-store";

type PersistedConfig = Pick<SupportConfig, "mode" | "size" | "isOpen">;

type PersistedState = {
        navigation?: SupportNavigation;
        config?: PersistedConfig;
};

function createDefaultNavigation(): SupportNavigation {
        return {
                current: { page: "HOME" },
                previousPages: [],
        };
}

function createDefaultConfig(): SupportConfig {
        return {
                size: "normal",
                mode: "floating",
                content: {},
                isOpen: false,
        };
}

function createDefaultState(): SupportStoreState {
        return {
                navigation: createDefaultNavigation(),
                config: createDefaultConfig(),
        };
}

function cloneNavigationState(state: NavigationState): NavigationState {
        switch (state.page) {
                case "CONVERSATION":
                        return {
                                page: "CONVERSATION",
                                params: state.params ? { ...state.params } : undefined,
                        };
                default:
                        return { page: state.page, params: state.params } as NavigationState;
        }
}

function parsePersistedState(
        persisted: PersistedState | null | undefined,
        fallback: SupportStoreState
): SupportStoreState {
        if (!persisted) {
                return fallback;
        }

        const persistedNavigation = persisted.navigation;
        const navigation: SupportNavigation = {
                current: persistedNavigation?.current
                        ? cloneNavigationState(persistedNavigation.current)
                        : cloneNavigationState(fallback.navigation.current),
                previousPages: (persistedNavigation?.previousPages ?? fallback.navigation.previousPages).map(
                        (page) => cloneNavigationState(page)
                ),
        };

        const config: SupportConfig = {
                ...fallback.config,
                ...persisted.config,
        };

        return {
                navigation,
                config,
        };
}

function getInitialState(options: SupportStoreOptions): SupportStoreState {
        const fallback = createDefaultState();
        const storage = options.storage;
        if (!storage) {
                return fallback;
        }

        try {
                const raw = storage.getItem(options.storageKey ?? STORAGE_KEY);
                if (!raw) {
                        return fallback;
                }

                const parsed = JSON.parse(raw) as PersistedState;
                return parsePersistedState(parsed, fallback);
        } catch (error) {
                console.warn("[SupportStore] Failed to read persisted state", error);
                return fallback;
        }
}

function persistState(
        state: SupportStoreState,
        options: SupportStoreOptions
): void {
        const storage = options.storage;
        if (!storage) {
                return;
        }

        const data: PersistedState = {
                navigation: {
                        current: state.navigation.current,
                        previousPages: [...state.navigation.previousPages],
                },
                config: {
                        mode: state.config.mode,
                        size: state.config.size,
                        isOpen: state.config.isOpen,
                },
        };

        try {
                storage.setItem(
                        options.storageKey ?? STORAGE_KEY,
                        JSON.stringify(data)
                );
        } catch (error) {
                console.warn("[SupportStore] Failed to persist state", error);
        }
}

export function createSupportStore(
        options: SupportStoreOptions = {}
): SupportStore {
        const initialState = getInitialState(options);
        const store = createStore<SupportStoreState>(initialState);

        const commit = (updater: (state: SupportStoreState) => SupportStoreState) => {
                const previous = store.getState();
                store.setState(updater);
                const next = store.getState();
                if (next !== previous) {
                        persistState(next, options);
                }
        };

        return {
                ...store,
                navigate(state) {
                        commit((current) => ({
                                navigation: {
                                        previousPages: [
                                                ...current.navigation.previousPages,
                                                current.navigation.current,
                                        ],
                                        current: state,
                                },
                                config: current.config,
                        }));
                },
                replace(state) {
                        commit((current) => ({
                                navigation: {
                                        ...current.navigation,
                                        current: state,
                                },
                                config: current.config,
                        }));
                },
                goBack() {
                        commit((current) => {
                                const { previousPages } = current.navigation;
                                if (previousPages.length === 0) {
                                        return current;
                                }

                                const nextPrevious = previousPages.slice(0, -1);
                                const previous = previousPages[previousPages.length - 1];

                                if (!previous) {
                                        return current;
                                }

                                return {
                                        navigation: {
                                                previousPages: nextPrevious,
                                                current: previous,
                                        },
                                        config: current.config,
                                };
                        });
                },
                open() {
                        commit((current) => ({
                                navigation: current.navigation,
                                config: { ...current.config, isOpen: true },
                        }));
                },
                close() {
                        commit((current) => ({
                                navigation: current.navigation,
                                config: { ...current.config, isOpen: false },
                        }));
                },
                toggle() {
                        commit((current) => ({
                                navigation: current.navigation,
                                config: { ...current.config, isOpen: !current.config.isOpen },
                        }));
                },
                updateConfig(config) {
                        commit((current) => ({
                                navigation: current.navigation,
                                config: { ...current.config, ...config },
                        }));
                },
                reset() {
                        commit(() => createDefaultState());
                },
        };
}
