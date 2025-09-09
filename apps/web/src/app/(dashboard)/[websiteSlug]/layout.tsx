import { redirect } from "next/navigation";
import { CentralContainer } from "@/components/ui/layout";
import { NavigationTopbar } from "@/components/ui/layout/navigation-topbar";
import { WebsiteProvider } from "@/contexts/dashboard/website-context";
import {
	getQueryClient,
	HydrateClient,
	prefetch,
	trpc,
} from "@/lib/trpc/server";

interface LayoutProps {
	children: React.ReactNode;
	params: Promise<{
		websiteSlug: string;
	}>;
}

export default async function Layout({ children, params }: LayoutProps) {
	const { websiteSlug } = await params;
	const queryClient = getQueryClient();

	await Promise.all([
		prefetch(
			trpc.website.getBySlug.queryOptions({ slug: websiteSlug }),
			(error) => {
				// Handle any error type, not just UNAUTHORIZED
				if (
					error.data?.code === "UNAUTHORIZED" ||
					error.data?.code === "FORBIDDEN"
				) {
					redirect("/select");
				}
				// For other errors, we still redirect to select
				// This ensures the user doesn't see a broken page
				redirect("/select");
			}
		),
		prefetch(trpc.view.list.queryOptions({ slug: websiteSlug }), (error) => {
			// Handle any error type, not just UNAUTHORIZED
			if (
				error.data?.code === "UNAUTHORIZED" ||
				error.data?.code === "FORBIDDEN"
			) {
				redirect("/select");
			}
			// For other errors, we still redirect to select
			// This ensures the user doesn't see a broken page
			redirect("/select");
		}),
		// Prefetch the conversation headers as an infinite query
		queryClient.prefetchInfiniteQuery({
			queryKey: [
				...trpc.conversation.listConversationsHeaders.queryOptions({
					websiteSlug,
				}).queryKey,
				{ type: "infinite" },
			],
			queryFn: async ({ pageParam }) => {
				const response = await queryClient.fetchQuery(
					trpc.conversation.listConversationsHeaders.queryOptions({
						websiteSlug,
						limit: 500,
						cursor: pageParam ?? null,
					})
				);
				return response;
			},
			initialPageParam: null as string | null,
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			pages: 1, // Prefetch the first page
		}),
	]);

	return (
		<HydrateClient>
			<WebsiteProvider websiteSlug={websiteSlug}>
				<div className="h-screen w-screen overflow-hidden bg-background-100 dark:bg-background-100">
					<NavigationTopbar />
					<CentralContainer>{children}</CentralContainer>
				</div>
			</WebsiteProvider>
		</HydrateClient>
	);
}
