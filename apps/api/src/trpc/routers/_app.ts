import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { aiAgentRouter } from "./ai-agent";
import { contactRouter } from "./contact";
import { conversationRouter } from "./conversation";
import { knowledgeRouter } from "./knowledge";
import { notificationRouter } from "./notification";
import { planRouter } from "./plan";
import { resendRouter } from "./resend";
import { uploadRouter } from "./upload";
import { userRouter } from "./user";
import { viewRouter } from "./view";
import { visitorRouter } from "./visitor";
import { websiteRouter } from "./website";

export const origamiTRPCRouter = createTRPCRouter({
	aiAgent: aiAgentRouter,
	resend: resendRouter,
	user: userRouter,
	website: websiteRouter,
	conversation: conversationRouter,
	view: viewRouter,
	visitor: visitorRouter,
	contact: contactRouter,
	upload: uploadRouter,
	plan: planRouter,
	notification: notificationRouter,
	knowledge: knowledgeRouter,
});

// export type definition of API
export type OrigamiTRPCRouter = typeof origamiTRPCRouter;
export type OrigamiTRPCRouterOutputs = inferRouterOutputs<OrigamiTRPCRouter>;
export type OrigamiTRPCRouterInputs = inferRouterInputs<OrigamiTRPCRouter>;

export type RouterInputs = inferRouterInputs<OrigamiTRPCRouter>;
export type RouterOutputs = inferRouterOutputs<OrigamiTRPCRouter>;
