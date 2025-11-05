import { db } from "@api/db";
import { getOrganizationBySlug } from "@api/db/queries/organization";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { TextEffect } from "@/components/ui/text-effect";
import { ensurePageAuth } from "@/lib/auth/server";
import CreationFlowWrapper from "./creation-flow";

export default async function Page({
	params,
}: {
	params: Promise<{
		organizationSlug: string;
	}>;
}) {
	const { organizationSlug } = await params;

	const [organization] = await Promise.all([
		getOrganizationBySlug(db, organizationSlug),
		ensurePageAuth(),
	]);

	if (!organization) {
		notFound();
	}

	return (
		<div className="flex max-w-xl flex-col">
			<CreationFlowWrapper organizationId={organization.id} />
		</div>
	);
}
