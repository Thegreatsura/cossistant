import type { QueryClient } from "@tanstack/react-query";

type WebsiteContext = {
	id: string;
	slug: string;
};

export type DashboardRealtimeContext = {
	queryClient: QueryClient;
	website: WebsiteContext;
	userId: string | null;
};
