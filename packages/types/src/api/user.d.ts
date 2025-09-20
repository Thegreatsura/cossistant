import { z } from "@hono/zod-openapi";
/**
 * Visitor data update request schema
 */
export declare const userResponseSchema: z.ZodObject<
	{
		id: z.ZodString;
		name: z.ZodOptional<z.ZodString>;
		email: z.ZodString;
		role: z.ZodNullable<z.ZodString>;
		image: z.ZodNullable<z.ZodString>;
		createdAt: z.ZodDate;
		updatedAt: z.ZodDate;
		lastSeenAt: z.ZodNullable<z.ZodDate>;
	},
	z.core.$strip
>;
export type UserResponse = z.infer<typeof userResponseSchema>;
//# sourceMappingURL=user.d.ts.map
