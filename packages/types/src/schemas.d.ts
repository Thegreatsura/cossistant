import { z } from "zod";
export declare const messageSchema: z.ZodObject<
	{
		id: z.ZodString;
		bodyMd: z.ZodString;
		type: z.ZodEnum<{
			image: "image";
			text: "text";
			file: "file";
		}>;
		userId: z.ZodNullable<z.ZodString>;
		aiAgentId: z.ZodNullable<z.ZodString>;
		parentMessageId: z.ZodNullable<z.ZodString>;
		modelUsed: z.ZodNullable<z.ZodString>;
		visitorId: z.ZodNullable<z.ZodString>;
		conversationId: z.ZodString;
		createdAt: z.ZodDate;
		updatedAt: z.ZodDate;
		deletedAt: z.ZodNullable<z.ZodDate>;
		visibility: z.ZodEnum<{
			public: "public";
			private: "private";
		}>;
	},
	z.core.$strip
>;
export type Message = z.infer<typeof messageSchema>;
export declare const viewSchema: z.ZodObject<
	{
		id: z.ZodString;
		name: z.ZodString;
		description: z.ZodNullable<z.ZodString>;
		prompt: z.ZodNullable<z.ZodString>;
		organizationId: z.ZodString;
		websiteId: z.ZodString;
		createdAt: z.ZodDate;
		updatedAt: z.ZodDate;
		deletedAt: z.ZodNullable<z.ZodDate>;
	},
	z.core.$strip
>;
export type InboxView = z.infer<typeof viewSchema>;
export declare const conversationSchema: z.ZodObject<
	{
		id: z.ZodString;
		title: z.ZodOptional<z.ZodString>;
		createdAt: z.ZodDate;
		updatedAt: z.ZodDate;
		visitorId: z.ZodString;
		websiteId: z.ZodString;
		status: z.ZodDefault<
			z.ZodEnum<{
				open: "open";
				resolved: "resolved";
				spam: "spam";
			}>
		>;
		lastMessage: z.ZodOptional<
			z.ZodObject<
				{
					id: z.ZodString;
					bodyMd: z.ZodString;
					type: z.ZodEnum<{
						image: "image";
						text: "text";
						file: "file";
					}>;
					userId: z.ZodNullable<z.ZodString>;
					aiAgentId: z.ZodNullable<z.ZodString>;
					parentMessageId: z.ZodNullable<z.ZodString>;
					modelUsed: z.ZodNullable<z.ZodString>;
					visitorId: z.ZodNullable<z.ZodString>;
					conversationId: z.ZodString;
					createdAt: z.ZodDate;
					updatedAt: z.ZodDate;
					deletedAt: z.ZodNullable<z.ZodDate>;
					visibility: z.ZodEnum<{
						public: "public";
						private: "private";
					}>;
				},
				z.core.$strip
			>
		>;
	},
	z.core.$strip
>;
export type Conversation = z.infer<typeof conversationSchema>;
export declare const conversationEventSchema: z.ZodObject<
	{
		id: z.ZodString;
		organizationId: z.ZodString;
		conversationId: z.ZodString;
		type: z.ZodEnum<{
			resolved: "resolved";
			assigned: "assigned";
			unassigned: "unassigned";
			participant_requested: "participant_requested";
			participant_joined: "participant_joined";
			participant_left: "participant_left";
			status_changed: "status_changed";
			priority_changed: "priority_changed";
			tag_added: "tag_added";
			tag_removed: "tag_removed";
			reopened: "reopened";
		}>;
		actorUserId: z.ZodNullable<z.ZodString>;
		actorAiAgentId: z.ZodNullable<z.ZodString>;
		targetUserId: z.ZodNullable<z.ZodString>;
		targetAiAgentId: z.ZodNullable<z.ZodString>;
		message: z.ZodOptional<z.ZodString>;
		metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
		createdAt: z.ZodDate;
		updatedAt: z.ZodDate;
		deletedAt: z.ZodNullable<z.ZodDate>;
	},
	z.core.$strip
>;
export type ConversationEvent = z.infer<typeof conversationEventSchema>;
export declare const conversationSeenSchema: z.ZodObject<
	{
		id: z.ZodString;
		conversationId: z.ZodString;
		userId: z.ZodNullable<z.ZodString>;
		visitorId: z.ZodNullable<z.ZodString>;
		aiAgentId: z.ZodNullable<z.ZodString>;
		createdAt: z.ZodDate;
		updatedAt: z.ZodDate;
		deletedAt: z.ZodNullable<z.ZodDate>;
	},
	z.core.$strip
>;
export type ConversationSeen = z.infer<typeof conversationSeenSchema>;
//# sourceMappingURL=schemas.d.ts.map
