import { Page, PageHeader, PageHeaderTitle } from "@/components/ui/layout";
import { NavigationSidebar } from "@/components/ui/layout/sidebars/navigation/navigation-sidebar";
import { TextEffect } from "@/components/ui/text-effect";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";

interface DashboardPageProps {
	params: Promise<{
		websiteSlug: string;
		conversationId: string;
	}>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
	const { websiteSlug, conversationId } = await params;

	await ensureWebsiteAccess(websiteSlug);

	return (
		<>
			{/* <NavigationSidebar /> */}
			<Page className="flex items-center justify-center">
				<PageHeader defaultBackPath={`/${websiteSlug}`}>
					<PageHeaderTitle>Conversation {conversationId}</PageHeaderTitle>
				</PageHeader>
				<div className="flex flex-col gap-2 font-medium">
					<TextEffect className="font-normal text-3xl">
						Conversation {conversationId}
					</TextEffect>
				</div>
			</Page>
		</>
	);
}
