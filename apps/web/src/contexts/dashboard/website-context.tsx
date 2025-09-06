"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { useQuery } from "@tanstack/react-query";
import type { TRPCClientErrorBase } from "@trpc/client";
import type { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import";
import { createContext, useContext } from "react";
import { useTRPC } from "@/lib/trpc/client";

interface WebsiteContextValue {
	website: RouterOutputs["website"]["getBySlug"];
	isLoading: boolean;
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
		isFetching: isLoading,
		error,
	} = useQuery({
		...trpc.website.getBySlug.queryOptions({
			slug: websiteSlug,
		}),
	});

	return (
		<WebsiteContext.Provider
			value={{
				// biome-ignore lint/style/noNonNullAssertion: should never be null
				website: website!,
				isLoading,
				error,
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
