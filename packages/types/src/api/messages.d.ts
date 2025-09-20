import { z } from "@hono/zod-openapi";
export declare const createMessageSchema: z.ZodObject<
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
>;
export type CreateMessageSchema = z.infer<typeof createMessageSchema>;
//# sourceMappingURL=messages.d.ts.map
