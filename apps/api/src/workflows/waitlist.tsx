import {
	addUserToDefaultAudience,
	JoinedWaitlistEmail,
	sendEmail,
} from "@cossistant/transactional";
import { serve } from "@upstash/workflow/hono";
import { Hono } from "hono";

// Needed for email templates, don't remove
import React from "react";

import type { WaitlistJoinData } from "./types";

const waitlistWorkflow = new Hono();

waitlistWorkflow.post(
	"/join",
	serve<WaitlistJoinData>(async (context) => {
		const { userId, email, name } = context.requestPayload;

		await context.run("post-join-waitlist", async () => {
			console.log(
				`Processing waitlist join for user ${userId} with email ${email}`
			);

			// Send email and add user to default audience
			await Promise.all([
				sendEmail({
					to: email,
					subject: "Welcome to Cossistant",
					react: <JoinedWaitlistEmail email={email} name={name || ""} />,
					variant: "marketing",
				}),
				addUserToDefaultAudience(email),
			]);
		});
	})
);

export default waitlistWorkflow;
