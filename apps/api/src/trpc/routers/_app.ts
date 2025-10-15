import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { createTRPCRouter } from "../init";
import { contactRouter } from "./contact";
import { conversationRouter } from "./conversation";
import { resendRouter } from "./resend";
import { userRouter } from "./user";
import { viewRouter } from "./view";
import { visitorRouter } from "./visitor";
import { waitlistRouter } from "./waitlist";
import { websiteRouter } from "./website";

export const origamiTRPCRouter = createTRPCRouter({
	resend: resendRouter,
	user: userRouter,
	website: websiteRouter,
	waitlist: waitlistRouter,
	conversation: conversationRouter,
	view: viewRouter,
	visitor: visitorRouter,
	contact: contactRouter,
});

// export type definition of API
export type OrigamiTRPCRouter = typeof origamiTRPCRouter;
export type OrigamiTRPCRouterOutputs = inferRouterOutputs<OrigamiTRPCRouter>;
export type OrigamiTRPCRouterInputs = inferRouterInputs<OrigamiTRPCRouter>;

export type RouterInputs = inferRouterInputs<OrigamiTRPCRouter>;
export type RouterOutputs = inferRouterOutputs<OrigamiTRPCRouter>;
