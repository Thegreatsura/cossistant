import {
  SettingsHeader,
  SettingsPage,
  SettingsRow,
} from "@/components/ui/layout/settings-layout";
import { ensureWebsiteAccess } from "@/lib/auth/website-access";

type DevelopersSettingsPageProps = {
  params: Promise<{
    websiteSlug: string;
  }>;
};

export default async function DevelopersSettingsPage({
  params,
}: DevelopersSettingsPageProps) {
  const { websiteSlug } = await params;

  await ensureWebsiteAccess(websiteSlug);

  return (
    <SettingsPage className="pt-20">
      <SettingsHeader>Developers</SettingsHeader>

      <SettingsRow
        description="View and manage your public and private API keys."
        title="Public and private API keys"
      >
        <ul className="list-inside list-disc text-primary/60 text-sm">
          <li>- display and copy public API key</li>
          <li>- display and copy private API key</li>
          <li>- regenerate public API key</li>
          <li>- regenerate private API key</li>
          <li>- revoke public API key</li>
          <li>- revoke private API key</li>
          <li>- create new public API key</li>
          <li>- create new private API key</li>
          <li>
            - private keys can be test keys. Private keys can only be seen once
            they are created.
          </li>
        </ul>
      </SettingsRow>

      <SettingsRow
        description="A list of whitelisted domains from which your public API keys can be used."
        title="Allowed domains"
      >
        <ul className="list-inside list-disc text-primary/60 text-sm">
          <li>- display and copy allowed domains</li>
          <li>- add allowed domain</li>
          <li>- remove allowed domain</li>
        </ul>
      </SettingsRow>
    </SettingsPage>
  );
}
