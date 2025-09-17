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

const MAX_SESSION_TOKEN_LENGTH = 512;

export function normalizeSessionToken(
        token: string | null | undefined,
): string | undefined {
        if (!token) {
                return undefined;
        }

        const trimmed = token.trim();
        if (!trimmed) {
                return undefined;
        }

        if (trimmed.length > MAX_SESSION_TOKEN_LENGTH) {
                return undefined;
        }

        return trimmed;
}

export async function resolveSession(
        db: Database,
        params: {
                headers: Headers;
                sessionToken?: string | null;
        },
) {
        let userSession = await auth.api.getSession({ headers: params.headers });

        const tokensToCheck = new Set<string>();

        const normalizedOverride = normalizeSessionToken(params.sessionToken);
        if (normalizedOverride) {
                tokensToCheck.add(normalizedOverride);
        }

        const headerToken = normalizeSessionToken(
                params.headers.get("x-user-session-token"),
        );
        if (headerToken) {
                tokensToCheck.add(headerToken);
        }

        // Avoid querying again if the Better Auth session already resolves to the
        // same token.
        const currentToken = normalizeSessionToken(userSession?.session?.token);
        if (currentToken) {
                tokensToCheck.delete(currentToken);
        }

        for (const token of tokensToCheck) {
                const [res] = await db
                        .select()
                        .from(session)
                        .where(eq(session.token, token))
                        .innerJoin(user, eq(session.userId, user.id))
                        .limit(1)
                        .$withCache({ tag: "session" });

                if (res) {
                        userSession = {
                                session: res.session,
                                user: res.user,
                        };
                        break;
                }
        }

        return userSession;
}

export async function getTRPCSession(
        db: Database,
        params: {
                headers: Headers;
        },
) {
        return await resolveSession(db, { headers: params.headers });
}
