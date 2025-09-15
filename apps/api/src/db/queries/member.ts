import type { Database } from "@api/db";
import type { WebsiteInsert } from "@api/db/schema";
import { member, teamMember, user, website } from "@api/db/schema";
import { auth } from "@api/lib/auth";
import type { UserResponse } from "@cossistant/types/api/user";
import type { WebsiteStatus } from "@cossistant/types/enums";

import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

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
    ...orgMemberships.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.member.role,
      createdAt: member.member.createdAt,
      updatedAt: member.user.updatedAt,
      lastSeenAt: member.user.lastSeenAt,
    }))
  );

  // At somepoint, we should sort by team.
  // team = part of the website
  // org can have many teams and many websites
  // For now we will return all members to keep it simple

  return members;
}
