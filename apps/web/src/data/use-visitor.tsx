"use client";

import type { RouterOutputs } from "@api/trpc/types";
import { useQueryNormalizer } from "@normy/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTRPC } from "@/lib/trpc/client";

type VisitorResponse = RouterOutputs["conversation"]["getVisitorById"];

export function useVisitor({
	websiteSlug,
	visitorId,
}: {
	websiteSlug: string;
	visitorId: string;
}) {
	const trpc = useTRPC();
	const queryNormalizer = useQueryNormalizer();

	const placeholderVisitor = useMemo<VisitorResponse | undefined>(() => {
		if (!visitorId) {
			return;
		}

		return queryNormalizer.getObjectById<VisitorResponse>(visitorId);
	}, [queryNormalizer, visitorId]);

	const {
		data: visitor,
		isFetching,
		isLoading,
		error,
		isError,
		refetch,
	} = useQuery({
		...trpc.conversation.getVisitorById.queryOptions({
			websiteSlug,
			visitorId,
		}),
		placeholderData: placeholderVisitor,
		staleTime: 0,
		refetchOnMount: "always",
	});

	return {
		visitor: visitor ?? null,
		isLoading,
		isFetching,
		isError,
		error,
		refetch,
	};
}
