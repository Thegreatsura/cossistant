import type { CossistantClient } from "@cossistant/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type QueryFn<TData, TArgs> = (
	client: CossistantClient,
	args?: TArgs | undefined
) => Promise<TData>;

type UseClientQueryOptions<TData, TArgs> = {
        client: CossistantClient;
        queryFn: QueryFn<TData, TArgs>;
        enabled?: boolean;
        refetchInterval?: number | false;
	refetchOnWindowFocus?: boolean;
	refetchOnMount?: boolean;
	initialData?: TData;
	initialArgs?: TArgs;
	dependencies?: ReadonlyArray<unknown>;
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

const EMPTY_DEPENDENCIES: ReadonlyArray<unknown> = [];

export function useClientQuery<TData, TArgs = void>(
	options: UseClientQueryOptions<TData, TArgs>
): UseClientQueryResult<TData, TArgs> {
	const {
		client,
		queryFn,
		enabled = true,
		refetchInterval = false,
		refetchOnWindowFocus = true,
		refetchOnMount = true,
		initialData,
		initialArgs,
		dependencies = EMPTY_DEPENDENCIES,
	} = options;

	const [data, setData] = useState<TData | undefined>(initialData);
	const [error, setError] = useState<Error | null>(null);
        const [isLoading, setIsLoading] = useState(
                initialData === undefined && Boolean(enabled)
        );

	const dataRef = useRef(data);
	dataRef.current = data;

	const argsRef = useRef<TArgs | undefined>(initialArgs);
	const fetchIdRef = useRef(0);
	const hasMountedRef = useRef(false);
	const hasFetchedRef = useRef(initialData !== undefined);
	const isMountedRef = useRef(true);
	const queryFnRef = useRef(queryFn);

	queryFnRef.current = queryFn;

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		argsRef.current = initialArgs;
	}, [initialArgs]);

	const execute = useCallback(
		async (args?: TArgs, ignoreEnabled = false): Promise<TData | undefined> => {
                        if (!(enabled || ignoreEnabled)) {
                                return dataRef.current;
                        }

			const nextArgs = args ?? argsRef.current;
			argsRef.current = nextArgs;

			const fetchId = fetchIdRef.current + 1;
			fetchIdRef.current = fetchId;

			setIsLoading(true);
			setError(null);

			try {
				const result = await queryFnRef.current(client, nextArgs);

				if (!isMountedRef.current || fetchId !== fetchIdRef.current) {
					return dataRef.current;
				}

				dataRef.current = result;
				setData(result);
				setError(null);
				setIsLoading(false);
				hasFetchedRef.current = true;

				return result;
			} catch (raw: unknown) {
				if (!isMountedRef.current || fetchId !== fetchIdRef.current) {
					return dataRef.current;
				}

				const normalized = toError(raw);
				setError(normalized);
				setIsLoading(false);

				throw normalized;
			}
		},
                [client, enabled]
        );

        useEffect(() => {
                if (!enabled) {
                        setIsLoading(false);
                        return;
                }

		const shouldFetchInitially = hasMountedRef.current
			? true
			: refetchOnMount || !hasFetchedRef.current;

		hasMountedRef.current = true;

		if (!shouldFetchInitially) {
			return;
		}

		void execute(argsRef.current);
        }, [enabled, execute, refetchOnMount, ...dependencies]);

        useEffect(() => {
                if (!enabled) {
                        return;
                }

		if (
			refetchInterval === false ||
			refetchInterval === null ||
			refetchInterval <= 0 ||
			typeof window === "undefined"
		) {
			return;
		}

		const timer = window.setInterval(() => {
			void execute(argsRef.current);
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
                        if (!enabled) {
                                return;
                        }

                        void execute(argsRef.current);
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

	return useMemo(
		() => ({
			data,
			error,
			isLoading,
			refetch,
		}),
		[data, error, isLoading, refetch]
	);
}
