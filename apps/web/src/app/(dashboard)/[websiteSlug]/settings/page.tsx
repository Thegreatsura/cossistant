import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";
import { UserProfileForm } from "./user-profile-form";

type GeneralSettingsPageProps = {
	params: Promise<{
		websiteSlug: string;
	}>;
};

export default async function GeneralSettingsPage({
	params,
}: GeneralSettingsPageProps) {
	const { websiteSlug } = await params;
	const { user, website } = await ensureWebsiteAccess(websiteSlug);

	return (
		<SettingsPage>
			<SettingsHeader>General</SettingsHeader>
			<PageContent className="py-30">
				<SettingsRow
					description="Control how your name and avatar appear to teammates across Cossistant."
					title="Your profile"
				>
					<UserProfileForm
						initialAvatarUrl={user.image}
						initialName={user.name ?? ""}
						organizationId={website.organizationId}
						userId={user.id}
					/>
				</SettingsRow>
			</PageContent>
		</SettingsPage>
	);
}
