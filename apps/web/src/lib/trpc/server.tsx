/** biome-ignore-all lint/complexity/noVoid: ok in this file */
/** biome-ignore-all lint/suspicious/noExplicitAny: ok in this file */
import "server-only";

import { auth } from "@api/lib/auth";
import type { OrigamiTRPCRouter } from "@cossistant/api/types";
import { getCountryCode, getLocale, getTimezone } from "@cossistant/location";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCClient, loggerLink } from "@trpc/client";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import {
  createTRPCOptionsProxy,
  type TRPCQueryOptions,
} from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import superjson from "superjson";
import { getTRPCUrl } from "../url";
import { makeQueryClient } from "./query-client";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

// Create a plain tRPC client for server-side usage
export const trpc = createTRPCOptionsProxy<OrigamiTRPCRouter>({
  queryClient: getQueryClient,
  client: createTRPCClient<OrigamiTRPCRouter>({
    links: [
      httpBatchLink({
        url: getTRPCUrl(),
        transformer: superjson,
        async headers() {
          const session = await auth.api.getSession({
            headers: await headers(),
          });

          return {
            "x-user-timezone": await getTimezone(),
            "x-user-locale": await getLocale(),
            "x-user-country": await getCountryCode(),
            "x-user-session-token": session?.session.token,
          };
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
    ],
  }),
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T
) {
  const queryClient = getQueryClient();

  if (queryOptions.queryKey[1]?.type === "infinite") {
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}

export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptionsArray: T[]
) {
  const queryClient = getQueryClient();

  for (const queryOptions of queryOptionsArray) {
    if (queryOptions.queryKey[1]?.type === "infinite") {
      void queryClient.prefetchInfiniteQuery(queryOptions as any);
    } else {
      void queryClient.prefetchQuery(queryOptions);
    }
  }
}
