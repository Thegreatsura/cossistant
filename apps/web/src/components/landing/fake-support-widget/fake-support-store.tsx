"use client";

import React from "react";

type FakeSupportNavigationState = {
	current: {
		page: "CONVERSATION";
		params: {
			conversationId: string;
		};
	};
	previousPages: never[];
};

const FakeSupportNavigationContext = React.createContext<
	FakeSupportNavigationState | undefined
>(undefined);

const FakeSupportConfigContext = React.createContext<
	| {
			isOpen: boolean;
			open: () => void;
			close: () => void;
			toggle: () => void;
	  }
	| undefined
>(undefined);

type FakeSupportStoreProviderProps = {
	children: React.ReactNode;
	conversationId: string;
};

/**
 * Fake support store provider that mimics the support store behavior.
 * Completely isolated from the real support store singleton.
 */
export function FakeSupportStoreProvider({
	children,
	conversationId,
}: FakeSupportStoreProviderProps): React.ReactElement {
	const [isOpen, setIsOpen] = React.useState(true);

	const navigationValue = React.useMemo<FakeSupportNavigationState>(
		() => ({
			current: {
				page: "CONVERSATION",
				params: {
					conversationId,
				},
			},
			previousPages: [],
		}),
		[conversationId]
	);

	const configValue = React.useMemo(
		() => ({
			isOpen,
			open: () => setIsOpen(true),
			close: () => setIsOpen(false),
			toggle: () => setIsOpen((prev) => !prev),
		}),
		[isOpen]
	);

	return (
		<FakeSupportNavigationContext.Provider value={navigationValue}>
			<FakeSupportConfigContext.Provider value={configValue}>
				{children}
			</FakeSupportConfigContext.Provider>
		</FakeSupportNavigationContext.Provider>
	);
}

/**
 * Fake version of useSupportNavigation hook.
 * Always returns CONVERSATION page, goBack does nothing.
 */
export function useFakeSupportNavigation() {
	const context = React.useContext(FakeSupportNavigationContext);
	if (!context) {
		throw new Error(
			"useFakeSupportNavigation must be used within FakeSupportStoreProvider"
		);
	}

	return {
		current: context.current,
		page: context.current.page,
		params: context.current.params,
		previousPages: context.previousPages,
		navigate: () => {},
		replace: () => {},
		goBack: () => {},
		canGoBack: false,
	};
}

/**
 * Fake version of useSupportConfig hook.
 * Returns open/close state (always open for demo).
 */
export function useFakeSupportConfig() {
	const context = React.useContext(FakeSupportConfigContext);
	if (!context) {
		throw new Error(
			"useFakeSupportConfig must be used within FakeSupportStoreProvider"
		);
	}

	return context;
}
