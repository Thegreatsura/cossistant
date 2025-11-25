import { z } from "zod";
import { contactResponseSchema } from "../api/contact";

export const contactListItemSchema = z.object({
	id: z.ulid(),
	name: z.string().nullable(),
	email: z.string().nullable(),
	image: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
	visitorCount: z.number().int().min(0),
});

export type ContactListItem = z.infer<typeof contactListItemSchema>;

export const contactListVisitorStatusSchema = z.enum([
	"all",
	"withVisitors",
	"withoutVisitors",
]);

export type ContactListVisitorStatus = z.infer<
	typeof contactListVisitorStatusSchema
>;

export const listContactsResponseSchema = z.object({
	items: z.array(contactListItemSchema),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	totalCount: z.number().int().min(0),
});

export type ListContactsResponse = z.infer<typeof listContactsResponseSchema>;

export const contactVisitorSummarySchema = z.object({
	id: z.ulid(),
	lastSeenAt: z.string().nullable(),
	createdAt: z.string(),
	browser: z.string().nullable(),
	device: z.string().nullable(),
	country: z.string().nullable(),
	city: z.string().nullable(),
	language: z.string().nullable(),
	blockedAt: z.string().nullable(),
	blockedByUserId: z.string().nullable(),
	isBlocked: z.boolean(),
});

export type ContactVisitorSummary = z.infer<typeof contactVisitorSummarySchema>;

export const contactDetailResponseSchema = z.object({
	contact: contactResponseSchema,
	visitors: z.array(contactVisitorSummarySchema),
});

export type ContactDetailResponse = z.infer<typeof contactDetailResponseSchema>;
