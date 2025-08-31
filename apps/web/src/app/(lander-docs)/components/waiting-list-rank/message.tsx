import { getAuth } from "@/lib/auth/server";
import { getQueryClient, trpc } from "@/lib/trpc/server";

export async function WaitingListMessage() {
  const { user } = await getAuth();
  const queryClient = getQueryClient();

  const { entry, totalEntries } = await queryClient.fetchQuery(
    trpc.waitlist.getWaitlistEntry.queryOptions({
      userId: user?.id,
    })
  );
  return (
    <p className="text-balance text-center font-mono text-foreground/60 text-xs md:text-left">
      Already {totalEntries} people on the waitlist.{" "}
      {entry ? "You're in!" : "Join them, be early."}
    </p>
  );
}
