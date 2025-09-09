/** biome-ignore-all lint/style/noNonNullAssertion: ok here */
"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { useQuery } from "@tanstack/react-query";
import type { TRPCClientErrorBase } from "@trpc/client";
import type { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import";
import { createContext, useContext } from "react";
import { useConversationHeaders } from "@/data/use-conversation-headers";
import { useTRPC } from "@/lib/trpc/client";

interface WebsiteContextValue {
	website: RouterOutputs["website"]["getBySlug"];
	isLoading: boolean;
	views: RouterOutputs["view"]["list"];
	error: TRPCClientErrorBase<DefaultErrorShape> | null;
}

const WebsiteContext = createContext<WebsiteContextValue | null>(null);

interface WebsiteProviderProps {
	children: React.ReactNode;
	websiteSlug: string;
}

export function WebsiteProvider({
	children,
	websiteSlug,
}: WebsiteProviderProps) {
	const trpc = useTRPC();

	const {
		data: website,
		isFetching: isLoadingWebsite,
		error: errorWebsite,
	} = useQuery({
		...trpc.website.getBySlug.queryOptions({
			slug: websiteSlug,
		}),
	});

	const {
		data: views,
		isFetching: isLoadingViews,
		error: errorViews,
	} = useQuery({
		...trpc.view.list.queryOptions({
			slug: websiteSlug,
		}),
	});

	return (
		<WebsiteContext.Provider
			value={{
				website: website!,
				views: views!,
				isLoading: isLoadingWebsite || isLoadingViews,
				error: errorViews || errorWebsite,
			}}
		>
			{children}
		</WebsiteContext.Provider>
	);
}

export function useWebsite() {
	const context = useContext(WebsiteContext);

	if (!context) {
		throw new Error("useWebsite must be used within a WebsiteProvider");
	}

	if (!(context.website || context.isLoading)) {
		throw new Error("Website not found");
	}

	return context.website;
}

export function useWebsiteViews() {
	const context = useContext(WebsiteContext);

	if (!context) {
		throw new Error("useViews must be used within a WebsiteProvider");
	}

	return context.views;
}
