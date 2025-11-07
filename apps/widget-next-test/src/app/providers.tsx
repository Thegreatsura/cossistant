"use client";

import { SupportProvider } from "@cossistant/next";
import type { ReactNode } from "react";

type ProviderProps = {
	//   locale: string;
	children: ReactNode;
};

const API_URL =
	process.env.NODE_ENV === "development"
		? "http://localhost:8787/v1"
		: "https://api.cossistant.com/v1";

const WS_URL =
	process.env.NODE_ENV === "development"
		? "ws://localhost:8787/ws"
		: "wss://api.cossistant.com/ws";

export function Providers({ children }: ProviderProps) {
	return (
		<SupportProvider apiUrl={API_URL} wsUrl={WS_URL}>
			{children}
		</SupportProvider>
	);
}
