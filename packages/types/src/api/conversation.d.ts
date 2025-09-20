import { z } from "@hono/zod-openapi";
export declare const createConversationRequestSchema: z.ZodObject<
	{
		visitorId: z.ZodOptional<z.ZodString>;
		externalVisitorId: z.ZodOptional<z.ZodString>;
		conversationId: z.ZodOptional<z.ZodString>;
		defaultMessages: z.ZodArray<
			z.ZodObject<
				{
					id: z.ZodOptional<z.ZodString>;
					bodyMd: z.ZodString;
					type: z.ZodDefault<
						z.ZodEnum<{
							image: "image";
							text: "text";
							file: "file";
						}>
					>;
					userId: z.ZodNullable<z.ZodString>;
					aiAgentId: z.ZodNullable<z.ZodString>;
					visitorId: z.ZodNullable<z.ZodString>;
					conversationId: z.ZodString;
					createdAt: z.ZodCoercedDate<unknown>;
					updatedAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
					deletedAt: z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>;
					visibility: z.ZodDefault<
						z.ZodOptional<
							z.ZodEnum<{
								public: "public";
								private: "private";
							}>
						>
					>;
				},
				z.core.$strip
			>
		>;
		channel: z.ZodDefault<z.ZodString>;
	},
	z.core.$strip
>;
export type CreateConversationRequestBody = z.infer<
	typeof createConversationRequestSchema
>;
export declare const createConversationResponseSchema: z.ZodObject<
	{
		initialMessages: z.ZodArray<
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
		conversation: z.ZodObject<
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
	},
	z.core.$strip
>;
export type CreateConversationResponseBody = z.infer<
	typeof createConversationResponseSchema
>;
export declare const listConversationsRequestSchema: z.ZodObject<
	{
		visitorId: z.ZodOptional<z.ZodString>;
		externalVisitorId: z.ZodOptional<z.ZodString>;
		page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
		limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
		status: z.ZodOptional<
			z.ZodEnum<{
				open: "open";
				closed: "closed";
			}>
		>;
		orderBy: z.ZodDefault<
			z.ZodEnum<{
				createdAt: "createdAt";
				updatedAt: "updatedAt";
			}>
		>;
		order: z.ZodDefault<
			z.ZodEnum<{
				asc: "asc";
				desc: "desc";
			}>
		>;
	},
	z.core.$strip
>;
export type ListConversationsRequest = z.infer<
	typeof listConversationsRequestSchema
>;
export declare const listConversationsResponseSchema: z.ZodObject<
	{
		conversations: z.ZodArray<
			z.ZodObject<
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
			>
		>;
		pagination: z.ZodObject<
			{
				page: z.ZodNumber;
				limit: z.ZodNumber;
				total: z.ZodNumber;
				totalPages: z.ZodNumber;
				hasMore: z.ZodBoolean;
			},
			z.core.$strip
		>;
	},
	z.core.$strip
>;
export type ListConversationsResponse = z.infer<
	typeof listConversationsResponseSchema
>;
export declare const getConversationRequestSchema: z.ZodObject<
	{
		conversationId: z.ZodString;
	},
	z.core.$strip
>;
export type GetConversationRequest = z.infer<
	typeof getConversationRequestSchema
>;
export declare const getConversationResponseSchema: z.ZodObject<
	{
		conversation: z.ZodObject<
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
	},
	z.core.$strip
>;
export type GetConversationResponse = z.infer<
	typeof getConversationResponseSchema
>;
//# sourceMappingURL=conversation.d.ts.map
