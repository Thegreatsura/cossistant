import type { Database } from "@api/db";
import { member, user } from "@api/db/schema";
import type { UserResponse } from "@cossistant/types/api/user";

import { eq } from "drizzle-orm";

// Check if user has access to a website
export async function getWebsiteMembers(
  db: Database,
  params: {
    organizationId: string;
    websiteTeamId: string;
  }
) {
  const members: UserResponse[] = [];

  // Check if user is an owner or admin of the organization
  const [orgMemberships] = await Promise.all([
    db
      .select()
      .from(member)
      .where(eq(member.organizationId, params.organizationId))
      // Join user by userId
      .innerJoin(user, eq(member.userId, user.id)),
    // db
    //   .select()
    //   .from(teamMember)
    //   .where(eq(teamMember.teamId, params.websiteTeamId))
    //   // Join user by userId
    //   .innerJoin(user, eq(teamMember.userId, user.id)),
  ]);

  // Add organization members
  members.push(
    ...orgMemberships.map((data) => ({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      image: data.user.image,
      role: data.member.role,
      createdAt: data.member.createdAt.toISOString(),
      updatedAt: data.user.updatedAt,
      lastSeenAt: data.user.lastSeenAt ?? null,
    }))
  );

  // At somepoint, we should sort by team.
  // team = part of the website
  // org can have many teams and many websites
  // For now we will return all members to keep it simple

  return members;
}
