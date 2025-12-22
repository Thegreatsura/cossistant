"use client";

import {
	createSupportStore,
	type SupportConfig,
	type SupportStore,
	type SupportStoreState,
} from "@cossistant/core";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useControlledState } from "../context/controlled-state";

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

export type UseSupportConfigResult = {
	isOpen: boolean;
	size: SupportConfig["size"];
	open: () => void;
	close: () => void;
	toggle: () => void;
};

/**
 * Access widget configuration (isOpen, size) and toggle helpers.
 * Supports both controlled and uncontrolled modes.
 *
 * In controlled mode (when `open` prop is provided to Support),
 * the `isOpen` state is driven by the prop, and `open`/`close`/`toggle`
 * will call `onOpenChange` instead of updating internal state.
 *
 * @example
 * // Uncontrolled (internal state)
 * const { isOpen, open, close, toggle } = useSupportConfig();
 *
 * @example
 * // Controlled (external state via Support props)
 * <Support open={isOpen} onOpenChange={setIsOpen}>
 *   <MyComponent />
 * </Support>
 */
export const useSupportConfig = (): UseSupportConfigResult => {
	const config = useSelector((state) => state.config);
	const controlledState = useControlledState();

	// Determine if we're in controlled mode
	const isControlled = controlledState?.isControlled ?? false;
	const controlledOpen = controlledState?.open;
	const onOpenChange = controlledState?.onOpenChange;

	// Use controlled state if available, otherwise use store state
	const isOpen = isControlled ? (controlledOpen ?? false) : config.isOpen;

	// Create wrapped actions that respect controlled mode
	const open = useCallback(() => {
		if (isControlled && onOpenChange) {
			onOpenChange(true);
		} else {
			store.open();
		}
	}, [isControlled, onOpenChange]);

	const close = useCallback(() => {
		if (isControlled && onOpenChange) {
			onOpenChange(false);
		} else {
			store.close();
		}
	}, [isControlled, onOpenChange]);

	const toggle = useCallback(() => {
		if (isControlled && onOpenChange) {
			onOpenChange(!controlledOpen);
		} else {
			store.toggle();
		}
	}, [isControlled, onOpenChange, controlledOpen]);

	return useMemo(
		() => ({
			isOpen,
			size: config.size,
			open,
			close,
			toggle,
		}),
		[isOpen, config.size, open, close, toggle]
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
