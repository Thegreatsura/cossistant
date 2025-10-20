import {
  SettingsHeader,
  SettingsPage,
  SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";

type UsageSettingsPageProps = {
  params: Promise<{
    websiteSlug: string;
  }>;
};

export default async function UsageSettingsPage({
  params,
}: UsageSettingsPageProps) {
  const { websiteSlug } = await params;
  await ensureWebsiteAccess(websiteSlug);

  return (
    <SettingsPage>
      <SettingsHeader>Plan & Usage</SettingsHeader>

      <SettingsRow description="View your plan and usage details." title="Plan">
        <ul className="list-inside list-disc text-primary/60 text-sm">
          <li>- display and copy organisation id</li>
          <li>- display and copy organisation slug</li>
        </ul>
      </SettingsRow>
    </SettingsPage>
  );
}
