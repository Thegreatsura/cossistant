"use client";

import { useRealtimeSupport } from "@cossistant/next/hooks";
import { Support, useSupportConfig } from "@cossistant/next/support";
import { type DefaultMessage, SenderType } from "@cossistant/types";
import { motion } from "motion/react";
import Image from "next/image";
import { LogoText } from "@/components/ui/logo";

function PlaygroundPropDisplay({
  name,
  value,
}: {
  name: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 font-medium uppercase">
      <h2 className="text-primary/80 text-sm">{name}</h2>
      <div className="h-[1px] flex-1 bg-primary/10" />
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

const DEFAULT_MESSAGES: DefaultMessage[] = [
  {
    content: "Hi 👋 I'm Anthony, founder of Cossistant",
    senderType: SenderType.TEAM_MEMBER,
  },
  {
    content: "How can I help you?",
    senderType: SenderType.TEAM_MEMBER,
  },
];

const QUICK_OPTIONS = ["How to install Cossistant?", "Pricing"];

export default function Playground() {
  const { isConnected } = useRealtimeSupport();
  const { mode, size, isOpen } = useSupportConfig();

  return (
    <div className="relative flex min-h-screen items-center bg-background p-20">
      <Image
        alt="Playground"
        className="absolute inset-0 z-0 object-fill opacity-5 grayscale-100"
        fill
        src="https://cdn.cossistant.com/neom-t3dlLOhdEzs-unsplash.jpg"
      />
      <div className="z-10 h-fit w-full md:w-1/3">
        <h1 className="flex items-center gap-2 font-f37-stout text-xl">
          <LogoText />
          <span className="font-medium text-primary/40">dev playground</span>
        </h1>
        <div className="mt-10 flex flex-col gap-2">
          <PlaygroundPropDisplay
            name="Websocket healthy"
            value={isConnected.toString()}
          />
          <PlaygroundPropDisplay name="Opened" value={isOpen.toString()} />
          <PlaygroundPropDisplay name="Mode" value={mode} />
          <PlaygroundPropDisplay name="Size" value={size} />
        </div>
      </div>
      <Support
        defaultMessages={DEFAULT_MESSAGES}
        defaultOpen
        quickOptions={QUICK_OPTIONS}
      />
    </div>
  );
}
