import { useMemo, useCallback } from "react";
import type { Mention, MentionType } from "@cossistant/tiny-markdown";

export type MentionableEntityType = "ai-agent" | "human-agent" | "visitor";

export type MentionableEntity = {
	id: string;
	name: string;
	type: MentionableEntityType;
	image?: string | null;
	email?: string | null;
};

export type UseMentionSearchOptions = {
	aiAgent?: {
		id: string;
		name: string;
		isActive?: boolean;
	} | null;
	teamMembers?: Array<{
		id: string;
		name: string;
		email: string;
		image: string | null;
	}>;
	visitor?: {
		id: string;
		contact?: {
			name?: string | null;
			email?: string | null;
		} | null;
	} | null;
};

/**
 * Hook to create a mention search function that combines AI agent, team members, and visitor.
 */
export function useMentionSearch({
	aiAgent,
	teamMembers = [],
	visitor,
}: UseMentionSearchOptions) {
	// Build the list of mentionable entities
	const entities = useMemo<MentionableEntity[]>(() => {
		const result: MentionableEntity[] = [];

		// Add AI agent if active
		if (aiAgent?.isActive) {
			result.push({
				id: aiAgent.id,
				name: aiAgent.name,
				type: "ai-agent",
				image: null,
			});
		}

		// Add team members
		for (const member of teamMembers) {
			result.push({
				id: member.id,
				name: member.name,
				type: "human-agent",
				image: member.image,
				email: member.email,
			});
		}

		// Add visitor if they have a name
		if (visitor?.contact?.name) {
			result.push({
				id: visitor.id,
				name: visitor.contact.name,
				type: "visitor",
				email: visitor.contact.email,
			});
		}

		return result;
	}, [aiAgent, teamMembers, visitor]);

	// Search function that filters entities by query
	const search = useCallback(
		(query: string): Mention[] => {
			const lowerQuery = query.toLowerCase();

			return entities
				.filter((entity) => {
					const nameMatch = entity.name.toLowerCase().includes(lowerQuery);
					const emailMatch = entity.email?.toLowerCase().includes(lowerQuery);
					return nameMatch || emailMatch;
				})
				.map((entity) => ({
					id: entity.id,
					name: entity.name,
					type: entity.type as MentionType,
					avatar: entity.image ?? undefined,
				}));
		},
		[entities]
	);

	return {
		entities,
		search,
	};
}
