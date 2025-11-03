"use client";

import { Support } from "@cossistant/next";
import React from "react";
import { useHasScrolled } from "../../../hooks/use-has-scrolled";

function CossistantLandingSupport() {
	const hasScrolled = useHasScrolled(500);

	return (
		<div className="relative h-[800px] w-full bg-amber-200">
			<Support defaultOpen position="bottom" positioning="absolute" />
		</div>
	);
}

export default CossistantLandingSupport;
