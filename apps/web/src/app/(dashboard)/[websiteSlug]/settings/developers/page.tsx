import {
  SettingsHeader,
  SettingsPage,
  SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";
import { AllowedDomainsForm } from "./allowed-domains-form";
import { ApiKeysSection } from "./api-keys-section";

type DevelopersSettingsPageProps = {
  params: Promise<{
    websiteSlug: string;
  }>;
};

export default async function DevelopersSettingsPage({
  params,
}: DevelopersSettingsPageProps) {
  const { websiteSlug } = await params;

  const { website } = await ensureWebsiteAccess(websiteSlug);

  return (
    <SettingsPage className="pt-20">
      <SettingsHeader>Developers</SettingsHeader>
      <SettingsRow
        description="Create, review, and revoke the API keys connected to this website."
        title="Public and private API keys"
      >
        <ApiKeysSection
          organizationId={website.organizationId}
          websiteId={website.id}
          websiteSlug={website.slug}
        />
      </SettingsRow>

      <SettingsRow
        description="Manage the allowlist of domains that can use your public keys."
        title="Allowed domains"
      >
        <AllowedDomainsForm
          initialDomains={website.whitelistedDomains}
          organizationId={website.organizationId}
          websiteId={website.id}
          websiteSlug={website.slug}
        />
      </SettingsRow>
    </SettingsPage>
  );
}
