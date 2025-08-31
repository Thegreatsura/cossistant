import type { Database } from "@api/db";
import type {
  ApiKeySelect,
  OrganizationSelect,
  WebsiteSelect,
} from "@api/db/schema";
import { session, user } from "@api/db/schema";
import { auth } from "@api/lib/auth";

import { eq } from "drizzle-orm";

export type ApiKeyWithWebsiteAndOrganization = ApiKeySelect & {
  website: WebsiteSelect;
  organization: OrganizationSelect;
};

export async function getTRPCSession(
  db: Database,
  params: {
    headers: Headers;
  }
) {
  let userSession = await auth.api.getSession({ headers: params.headers });

  const sessionToken = params.headers.get("x-user-session-token");

  if (sessionToken) {
    const [res] = await db
      .select()
      .from(session)
      .where(eq(session.token, sessionToken))
      .innerJoin(user, eq(session.userId, user.id))
      .limit(1)
      .$withCache({ tag: "session" });

    if (res) {
      userSession = {
        session: res.session,
        user: res.user,
      };
    }
  }

  return userSession;
}
