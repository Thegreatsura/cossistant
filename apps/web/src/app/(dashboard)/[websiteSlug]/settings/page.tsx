import {
  SettingsHeader,
  SettingsPage,
  SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";

type GeneralSettingsPageProps = {
  params: Promise<{
    websiteSlug: string;
  }>;
};

export default async function GeneralSettingsPage({
  params,
}: GeneralSettingsPageProps) {
  const { websiteSlug } = await params;
  await ensureWebsiteAccess(websiteSlug);

  return (
    <SettingsPage className="pt-20">
      <SettingsHeader>General</SettingsHeader>

      <SettingsRow
        description="Update your website logo, slug, email and basic information."
        title="Website profile"
      >
        <ul className="list-inside list-disc text-primary/60 text-sm">
          <li>- display and copy organisation id</li>
          <li>- display and copy organisation slug</li>
        </ul>
      </SettingsRow>
      <SettingsRow
        description="Update your website logo, slug, email and basic information."
        title="Website profile"
      >
        <ul className="list-inside list-disc text-primary/60 text-sm">
          <li>- display and copy website id</li>
          <li>- display and copy website slug</li>
          <li>- update the website logo</li>
          <li>- update the website name and support email</li>
        </ul>
      </SettingsRow>
    </SettingsPage>
  );
}
