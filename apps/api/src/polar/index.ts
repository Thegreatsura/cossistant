import { env } from "@api/env";
import { Webhooks } from "@polar-sh/hono";
import { Hono } from "hono";

const polarRouters = new Hono();

polarRouters.post(
	"/webhooks",
	Webhooks({
		webhookSecret: env.POLAR_WEBHOOK_SECRET,
		onPayload: async (payload) => {
			console.log("WEBHOOK RECEIVED", payload);
		},
	})
);

export { polarRouters };
