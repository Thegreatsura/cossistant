import { z } from "zod";
import { visitorResponseSchema } from "../api/visitor";
import { conversationRecordSchema } from "./conversation";

export const blockVisitorResponseSchema = z.object({
  conversation: conversationRecordSchema,
  visitor: visitorResponseSchema,
});

export type BlockVisitorResponse = z.infer<typeof blockVisitorResponseSchema>;

export const visitorPresenceEntrySchema = z.object({
  id: z.string(),
  status: z.enum(["online", "away"]),
  lastSeenAt: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export const listVisitorPresenceResponseSchema = z.object({
  visitors: z.array(visitorPresenceEntrySchema),
  totals: z.object({
    online: z.number(),
    away: z.number(),
  }),
});

export type VisitorPresenceEntry = z.infer<typeof visitorPresenceEntrySchema>;
export type ListVisitorPresenceResponse = z.infer<
  typeof listVisitorPresenceResponseSchema
>;
