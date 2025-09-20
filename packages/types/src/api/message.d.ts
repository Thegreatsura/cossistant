import { z } from "zod";
export declare const getMessagesRequestSchema: z.ZodObject<
	{
		conversationId: z.ZodString;
		limit: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
		cursor: z.ZodOptional<z.ZodString>;
	},
	z.core.$strip
>;
export type GetMessagesRequest = z.infer<typeof getMessagesRequestSchema>;
export declare const getMessagesResponseSchema: z.ZodObject<
	{
		messages: z.ZodArray<
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
		nextCursor: z.ZodOptional<z.ZodString>;
		hasNextPage: z.ZodBoolean;
	},
	z.core.$strip
>;
export type GetMessagesResponse = z.infer<typeof getMessagesResponseSchema>;
export declare const sendMessageRequestSchema: z.ZodObject<
	{
		conversationId: z.ZodString;
		message: z.ZodObject<
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
				userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
				visitorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
				aiAgentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
				visibility: z.ZodDefault<
					z.ZodEnum<{
						public: "public";
						private: "private";
					}>
				>;
				createdAt: z.ZodOptional<z.ZodDate>;
			},
			z.core.$strip
		>;
	},
	z.core.$strip
>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export declare const sendMessageResponseSchema: z.ZodObject<
	{
		message: z.ZodObject<
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
	},
	z.core.$strip
>;
export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;
//# sourceMappingURL=message.d.ts.map
