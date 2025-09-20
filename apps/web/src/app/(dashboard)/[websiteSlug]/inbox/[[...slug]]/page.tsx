import { ensureWebsiteAccess } from "@/lib/auth/website-access";
import InboxClientRouter from "./client-router";

type DashboardPageProps = {
	params: Promise<{
		websiteSlug: string;
		slug: string[];
	}>;
};

export default async function InboxPage({ params }: DashboardPageProps) {
	const { websiteSlug } = await params;

	await ensureWebsiteAccess(websiteSlug);

	return <InboxClientRouter websiteSlug={websiteSlug} />;
}
