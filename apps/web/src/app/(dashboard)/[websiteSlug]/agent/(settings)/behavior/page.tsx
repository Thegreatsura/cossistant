import { redirect } from "next/navigation";

type BehaviorRedirectPageProps = {
	params: Promise<{
		websiteSlug: string;
	}>;
};

export default async function BehaviorRedirectPage({
	params,
}: BehaviorRedirectPageProps) {
	const { websiteSlug } = await params;
	redirect(`/${websiteSlug}/agent`);
}
