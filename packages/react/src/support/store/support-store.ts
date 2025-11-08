"use client";

import {
	createSupportStore,
	type SupportConfig,
	type SupportStore,
	type SupportStoreState,
} from "@cossistant/core";
import { useMemo, useRef, useSyncExternalStore } from "react";

const storage = typeof window !== "undefined" ? window.localStorage : undefined;
const store = createSupportStore({ storage });

type Selector<T> = (state: SupportStoreState) => T;

type EqualityChecker<T> = (previous: T, next: T) => boolean;

function useSelector<TSelected>(
	selector: Selector<TSelected>,
	isEqual: EqualityChecker<TSelected> = Object.is
): TSelected {
	const selectionRef = useRef<TSelected>(undefined);

	const subscribe = (onStoreChange: () => void) =>
		store.subscribe(() => {
			onStoreChange();
		});

	const snapshot = useSyncExternalStore(
		subscribe,
		store.getState,
		store.getState
	);

	const selected = selector(snapshot);

	if (
		selectionRef.current === undefined ||
		!isEqual(selectionRef.current, selected)
	) {
		selectionRef.current = selected;
	}

	return selectionRef.current as TSelected;
}

export type UseSupportStoreResult = SupportStoreState &
	Pick<
		SupportStore,
		| "navigate"
		| "replace"
		| "goBack"
		| "open"
		| "close"
		| "toggle"
		| "updateConfig"
		| "reset"
	>;

/**
 * Access the support widget store state and actions.
 *
 * @example
 * const { isOpen, navigate, toggle } = useSupportStore();
 */
export function useSupportStore(): UseSupportStoreResult {
	const state = useSelector((current) => current);

	return useMemo(
		() => ({
			...state,
			navigate: store.navigate,
			replace: store.replace,
			goBack: store.goBack,
			open: store.open,
			close: store.close,
			toggle: store.toggle,
			updateConfig: store.updateConfig,
			reset: store.reset,
		}),
		[state]
	);
}

/**
 * Access widget configuration (isOpen, size) and toggle helpers.
 *
 * @example
 * const { isOpen, open, close, toggle } = useSupportConfig();
 */
export const useSupportConfig = () => {
	const config = useSelector((state) => state.config);

	return useMemo(
		() => ({
			...config,
			open: store.open,
			close: store.close,
			toggle: store.toggle,
		}),
		[config]
	);
};

/**
 * Access navigation state and routing methods.
 *
 * @example
 * const { navigate, goBack, page, params } = useSupportNavigation();
 */
export const useSupportNavigation = () => {
	const navigation = useSelector((state) => state.navigation);
	const { current, previousPages } = navigation;

	return useMemo(
		() => ({
			current,
			page: current.page,
			params: current.params,
			previousPages,
			navigate: store.navigate,
			replace: store.replace,
			goBack: store.goBack,
			canGoBack: previousPages.length > 0,
		}),
		[current, previousPages]
	);
};

/**
 * Initialize store with default configuration (used internally by Support component).
 */
export const initializeSupportStore = (props: {
	size?: SupportConfig["size"];
	defaultOpen?: boolean;
}) => {
	const patch: Partial<SupportConfig> = {};

	if (props.size !== undefined) {
		patch.size = props.size;
	}

	if (props.defaultOpen !== undefined) {
		patch.isOpen = props.defaultOpen;
	}

	if (Object.keys(patch).length > 0) {
		store.updateConfig(patch);
	}
};
