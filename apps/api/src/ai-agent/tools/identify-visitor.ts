/**
 * Identify Visitor Tool
 *
 * Links a visitor to a contact using name/email and emits a timeline event
 * when the visitor is first identified.
 */

import {
	identifyContact,
	linkVisitorToContact,
	updateContact,
} from "@api/db/queries/contact";
import { getCompleteVisitorWithContact } from "@api/db/queries/visitor";
import { createConversationEvent } from "@api/utils/conversation-event";
import {
	ConversationEventType,
	TimelineItemVisibility,
} from "@cossistant/types";
import { tool } from "ai";
import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const inputSchema = z
	.object({
		email: z.string().email().optional().describe("Visitor email address"),
		name: z.string().optional().describe("Visitor name"),
	})
	.refine((data) => Boolean(data.email?.trim() || data.name?.trim()), {
		message: "Provide at least a name or email",
	});

export function createIdentifyVisitorTool(ctx: ToolContext) {
	return tool({
		description:
			"Identify or update a visitor's contact details (name/email). Use when the visitor shares their information or wants to update it.",
		inputSchema,
		execute: async ({
			email,
			name,
		}): Promise<
			ToolResult<{
				visitorId: string;
				contactId: string;
				eventEmitted: boolean;
			}>
		> => {
			try {
				const trimmedEmail = email?.trim() || undefined;
				const trimmedName = name?.trim() || undefined;

				const visitorRecord = await getCompleteVisitorWithContact(ctx.db, {
					visitorId: ctx.visitorId,
				});

				if (!visitorRecord) {
					return {
						success: false,
						error: "Visitor not found",
					};
				}

				const previousContact = visitorRecord.contact ?? null;
				const previousEmail =
					previousContact?.email?.trim() &&
					previousContact.email.trim().length > 0
						? previousContact.email.trim()
						: null;

				let contact = previousContact;

				if (contact) {
					const updates: Record<string, string> = {};

					if (trimmedEmail && trimmedEmail !== contact.email) {
						updates.email = trimmedEmail;
					}

					if (trimmedName && trimmedName !== contact.name) {
						updates.name = trimmedName;
					}

					if (Object.keys(updates).length > 0) {
						const updated = await updateContact(ctx.db, {
							contactId: contact.id,
							websiteId: ctx.websiteId,
							data: updates,
						});

						if (!updated) {
							return {
								success: false,
								error: "Failed to update contact",
							};
						}

						contact = updated;
					}
				} else {
					contact = await identifyContact(ctx.db, {
						websiteId: ctx.websiteId,
						organizationId: ctx.organizationId,
						email: trimmedEmail,
						name: trimmedName,
					});

					await linkVisitorToContact(ctx.db, {
						visitorId: ctx.visitorId,
						contactId: contact.id,
						websiteId: ctx.websiteId,
					});
				}

				const resolvedEmail =
					contact.email?.trim() && contact.email.trim().length > 0
						? contact.email.trim()
						: null;

				const shouldEmitEvent =
					!previousContact || (!previousEmail && !!resolvedEmail);

				if (shouldEmitEvent) {
					await createConversationEvent({
						db: ctx.db,
						context: {
							conversationId: ctx.conversationId,
							organizationId: ctx.organizationId,
							websiteId: ctx.websiteId,
							visitorId: ctx.visitorId,
						},
						event: {
							type: ConversationEventType.VISITOR_IDENTIFIED,
							actorAiAgentId: ctx.aiAgentId,
							visibility: TimelineItemVisibility.PUBLIC,
						},
					});
				}

				return {
					success: true,
					data: {
						visitorId: ctx.visitorId,
						contactId: contact.id,
						eventEmitted: shouldEmitEvent,
					},
				};
			} catch (error) {
				console.error(
					`[tool:identifyVisitor] conv=${ctx.conversationId} | Failed:`,
					error
				);
				return {
					success: false,
					error:
						error instanceof Error
							? error.message
							: "Failed to identify visitor",
				};
			}
		},
	});
}
