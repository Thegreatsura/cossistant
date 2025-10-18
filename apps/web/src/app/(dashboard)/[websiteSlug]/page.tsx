import { redirect } from "next/navigation";

export default async function Page({
	params,
}: {
	params: Promise<{ websiteSlug: string }>;
}) {
	const { websiteSlug } = await params;

	redirect(`/${websiteSlug}/inbox`);
}
