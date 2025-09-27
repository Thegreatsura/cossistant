import type { CossistantClient } from "@cossistant/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type QueryStatus = "idle" | "loading" | "success" | "error";

type QueryState<TData> = {
	data: TData | undefined;
	error: Error | null;
	status: QueryStatus;
};

type QueryFn<TData, TArgs> = (
	client: CossistantClient,
	args?: TArgs | undefined
) => Promise<TData>;

type UseClientQueryOptions<TData, TArgs> = {
	client: CossistantClient | null;
	queryKey: readonly unknown[] | string;
	queryFn: QueryFn<TData, TArgs>;
	enabled?: boolean;
	refetchInterval?: number | false;
	refetchOnWindowFocus?: boolean;
	refetchOnMount?: boolean;
	initialData?: TData;
	initialArgs?: TArgs;
};

type UseClientQueryResult<TData, TArgs> = {
	data: TData | undefined;
	error: Error | null;
	isLoading: boolean;
	refetch: (args?: TArgs) => Promise<TData | undefined>;
};

function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	return new Error(typeof error === "string" ? error : "Unknown error");
}

function toHash(key: readonly unknown[] | string): string {
	if (typeof key === "string") {
		return key;
	}

	return JSON.stringify(key);
}

export function useClientQuery<TData, TArgs = void>(
	options: UseClientQueryOptions<TData, TArgs>
): UseClientQueryResult<TData, TArgs> {
	const {
		client,
		queryKey,
		queryFn,
		enabled = true,
		refetchInterval = false,
		refetchOnWindowFocus = true,
		refetchOnMount = true,
		initialData,
		initialArgs,
	} = options;

	const keyParts = useMemo(
		() => (Array.isArray(queryKey) ? queryKey : [queryKey]),
		[queryKey]
	);
	const keyHash = useMemo(() => toHash(keyParts), [keyParts]);

	const [state, setState] = useState<QueryState<TData>>({
		data: initialData,
		error: null,
		status: initialData === undefined ? "idle" : "success",
	});
	const stateRef = useRef(state);
	stateRef.current = state;

	const latestArgsRef = useRef<TArgs | undefined>(initialArgs);
	const fetchIdRef = useRef(0);
	const hasFetchedRef = useRef(false);
	const isMountedRef = useRef(true);
	const previousKeyRef = useRef<string | null>(null);
	const keyChangedRef = useRef(false);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		latestArgsRef.current = initialArgs;
	}, [initialArgs]);

	useEffect(() => {
		if (previousKeyRef.current !== keyHash) {
			hasFetchedRef.current = false;
			keyChangedRef.current = true;
			previousKeyRef.current = keyHash;
			fetchIdRef.current += 1;
		}
	}, [keyHash]);

	useEffect(() => {
		fetchIdRef.current += 1;
	}, []);

	const execute = useCallback(
		async (args?: TArgs, ignoreEnabled = false): Promise<TData | undefined> => {
			if (!(client && (enabled || ignoreEnabled))) {
				return stateRef.current.data;
			}

			const fetchId = fetchIdRef.current + 1;
			fetchIdRef.current = fetchId;
			latestArgsRef.current = args;

			setState((current) => {
				if (current.status === "loading") {
					return current;
				}

				return {
					data: current.data,
					error: null,
					status: "loading",
				};
			});

			try {
				const result = await queryFn(client, args);

				if (!isMountedRef.current || fetchId !== fetchIdRef.current) {
					return stateRef.current.data;
				}

				setState({ data: result, error: null, status: "success" });
				hasFetchedRef.current = true;

				return result;
			} catch (error: unknown) {
				if (!isMountedRef.current || fetchId !== fetchIdRef.current) {
					return stateRef.current.data;
				}

				const normalized = toError(error);
				setState((current) => ({
					data: current.data,
					error: normalized,
					status: "error",
				}));

				throw normalized;
			}
		},
		[client, enabled, queryFn]
	);

	useEffect(() => {
		if (!(client && enabled)) {
			return;
		}

		const shouldFetch =
			keyChangedRef.current || (!hasFetchedRef.current && refetchOnMount);

		if (!shouldFetch) {
			return;
		}

		keyChangedRef.current = false;
		hasFetchedRef.current = true;
		void execute(latestArgsRef.current);
	}, [client, enabled, execute, refetchOnMount]);

	useEffect(() => {
		if (!(client && enabled)) {
			return;
		}

		if (typeof window === "undefined") {
			return;
		}

		if (
			refetchInterval === false ||
			refetchInterval === null ||
			refetchInterval <= 0
		) {
			return;
		}

		const timer = window.setInterval(() => {
			void execute(latestArgsRef.current);
		}, refetchInterval);

		return () => {
			window.clearInterval(timer);
		};
	}, [client, enabled, execute, refetchInterval]);

	useEffect(() => {
		if (
			!refetchOnWindowFocus ||
			typeof window === "undefined" ||
			typeof document === "undefined"
		) {
			return;
		}

		const handleRefetch = () => {
			if (!(client && enabled)) {
				return;
			}

			void execute(latestArgsRef.current);
		};

		const onFocus = () => {
			void handleRefetch();
		};

		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				void handleRefetch();
			}
		};

		window.addEventListener("focus", onFocus);
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			window.removeEventListener("focus", onFocus);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [client, enabled, execute, refetchOnWindowFocus]);

	const refetch = useCallback(
		async (args?: TArgs) => {
			return execute(args, true);
		},
		[execute]
	);

	return {
		data: state.data,
		error: state.error,
		isLoading: state.status === "loading",
		refetch,
	};
}
