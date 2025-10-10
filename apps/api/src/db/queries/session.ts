import type { Database } from "@api/db";
import type {
  ApiKeySelect,
  OrganizationSelect,
  SessionSelect,
  UserSelect,
  WebsiteSelect,
} from "@api/db/schema";
import { session, user } from "@api/db/schema";
import { auth } from "@api/lib/auth";
import type { Session, User } from "better-auth";

import { and, eq, gt } from "drizzle-orm";

export type ApiKeyWithWebsiteAndOrganization = ApiKeySelect & {
  website: WebsiteSelect;
  organization: OrganizationSelect;
};

const MAX_SESSION_TOKEN_LENGTH = 512;

export function normalizeSessionToken(
  token: string | null | undefined
): string | undefined {
  if (!token) {
    return;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return;
  }

  if (trimmed.length > MAX_SESSION_TOKEN_LENGTH) {
    return;
  }

  return trimmed;
}

export async function resolveSession(
  db: Database,
  params: {
    headers: Headers;
    sessionToken?: string | null;
  }
) {
  let foundSession: {
    session: Session & {
      activeOrganizationId?: string | null | undefined;
      activeTeamId?: string | null | undefined;
    };
    user: UserSelect;
  } | null = null;

  const betterAuthSession = await auth.api.getSession({
    headers: params.headers,
  });

  const tokensToCheck = new Set<string>();

  const normalizedOverride = normalizeSessionToken(params.sessionToken);

  if (normalizedOverride) {
    tokensToCheck.add(normalizedOverride);
  }

  const headerToken = normalizeSessionToken(
    params.headers.get("x-user-session-token")
  );

  if (headerToken) {
    tokensToCheck.add(headerToken);
  }

  // Avoid querying again if the Better Auth session already resolves to the
  // same token.
  const currentToken = normalizeSessionToken(betterAuthSession?.session?.token);

  if (currentToken) {
    tokensToCheck.delete(currentToken);
  }

  const now = new Date();

  for (const token of tokensToCheck) {
    const [res] = await db
      .select()
      .from(session)
      .where(and(eq(session.token, token), gt(session.expiresAt, now)))
      .innerJoin(user, eq(session.userId, user.id))
      .limit(1)
      .$withCache({ tag: `session:${token}` });

    if (res) {
      foundSession = {
        session: res.session,
        user: res.user,
      };

      break;
    }
  }

  return foundSession;
}

export async function getTRPCSession(
  db: Database,
  params: {
    headers: Headers;
  }
) {
  return await resolveSession(db, { headers: params.headers });
}
