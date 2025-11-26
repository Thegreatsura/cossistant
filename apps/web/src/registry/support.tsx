"use client";

import { Support as CossistantSupport } from "@cossistant/react";
import { Bubble } from "./bubble";

export default function Support() {
	return <CossistantSupport slots={{ bubble: Bubble }} />;
}
