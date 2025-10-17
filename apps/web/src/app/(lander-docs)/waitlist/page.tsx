import { generateSiteMetadata } from "@/lib/metadata";
import { getQueryClient, trpc } from "@/lib/trpc/server";
import { WaitlistForm } from "../components/waiting-list-rank/waitlist-form";

export const dynamic = "force-dynamic";

export const metadata = generateSiteMetadata({
  title: "Join the waitlist",
});

export default async function Page() {
  const queryClient = getQueryClient();
  const { totalEntries } = await queryClient.fetchQuery(
    trpc.waitlist.getWaitlistEntry.queryOptions({
      userId: undefined,
    }),
  );

  return (
    <main className="flex min-h-[80vh] flex-col gap-6 px-6 pt-48">
      <WaitlistForm totalEntries={totalEntries} />
    </main>
  );
}
