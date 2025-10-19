import { db } from "@api/db";
import { getWaitlistEntryByUserId } from "@api/db/queries/waitlist";
import { auth, type OrigamiSession, type OrigamiUser } from "@api/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getAuth = cache(
  async (): Promise<{
    user: OrigamiUser | null;
    session: OrigamiSession | null;
  }> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      return session ?? { user: null, session: null };
    } catch (error) {
      console.error("Error getting session:", error);

      return { user: null, session: null };
    }
  }
);

type EnsurePageAuthProps = {
  redirectTo: string;
};

export const ensurePageAuth = async (
  props: EnsurePageAuthProps = { redirectTo: "/" }
) => {
  const { session, user } = await getAuth();

  if (!(user && session)) {
    redirect(props.redirectTo);
  }

  return { session, user };
};

export const checkWaitlistAccess = async (userId: string) => {
  "use cache";

  const waitlistData = await getWaitlistEntryByUserId(db, { userId });
  return waitlistData.entry?.accessGranted ?? false;
};

export const ensureWaitlistAccess = async (userId: string) => {
  const hasAccess = await checkWaitlistAccess(userId);

  if (!hasAccess) {
    redirect("/waitlist/joined");
  }

  return hasAccess;
};
