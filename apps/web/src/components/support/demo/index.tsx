"use client";

import { Support } from "@cossistant/next";
import React from "react";
import { useHasScrolled } from "../../../hooks/use-has-scrolled";

function CossistantLandingSupport() {
  const hasScrolled = useHasScrolled(500);

  return <Support mode={hasScrolled ? "floating" : "responsive"} />;
}

export default CossistantLandingSupport;
