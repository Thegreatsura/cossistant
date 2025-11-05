"use client";

import {
	APIKeyType,
	type CreateWebsiteResponse,
	WebsiteInstallationTarget,
} from "@cossistant/types";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CodeBlockCommand } from "@/components/code-block-command";
import { DashboardCodeBlock } from "@/components/dashboard-code-block";
import { Button } from "@/components/ui/button";
import { Step, Steps } from "@/components/ui/steps";
import { useTRPC } from "@/lib/trpc/client";
import WebsiteCreationForm from "./website-creation-form";

type CreationFlowWrapperProps = {
	organizationId: string;
};

type WebsiteSetupState = {
	website: CreateWebsiteResponse;
	installationTarget: WebsiteInstallationTarget;
};

export default function CreationFlowWrapper({
	organizationId,
}: CreationFlowWrapperProps) {
	const trpc = useTRPC();
	const [websiteSetup, setWebsiteSetup] = useState<WebsiteSetupState | null>(
		null
	);

	const { mutate: createWebsite, isPending: isSubmitting } = useMutation(
		trpc.website.create.mutationOptions({
			onSuccess: (data, variables) => {
				setWebsiteSetup({
					website: data,
					installationTarget: variables.installationTarget,
				});
			},
		})
	);

	const publicApiKey = useMemo(() => {
		if (!websiteSetup) {
			return null;
		}

		return (
			websiteSetup.website.apiKeys.find(
				(key) => key.keyType === APIKeyType.PUBLIC && key.isTest
			)?.key ?? null
		);
	}, [websiteSetup]);

	const isNextInstallation =
		websiteSetup?.installationTarget === WebsiteInstallationTarget.NEXTJS;

	return (
		<Steps className="mt-10 pb-20">
			<Step completed={Boolean(websiteSetup)}>
				<div className="font-semibold text-lg">Create your website</div>
				<div className="mt-3 space-y-4">
					{websiteSetup ? (
						<div className="rounded border border-primary/10 bg-background-200 px-4 py-3 text-sm">
							<p className="font-medium text-primary">
								{websiteSetup.website.name} is ready.
							</p>
							<p className="mt-2 text-muted-foreground">
								We generated your default API keys and allowed localhost so you
								can start building immediately.
							</p>
						</div>
					) : (
						<WebsiteCreationForm
							isSubmitting={isSubmitting}
							onSubmit={createWebsite}
							organizationId={organizationId}
						/>
					)}
				</div>
			</Step>

			<Step enabled={Boolean(websiteSetup)}>
				<div className="font-semibold text-lg">Install Cossistant locally</div>
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="mt-3 space-y-6"
					initial={{ opacity: 0, y: 10 }}
					transition={{ duration: 0.5, delay: 0.7 }}
				>
					{websiteSetup ? (
						isNextInstallation ? (
							<>
								<p className="text-muted-foreground text-sm">
									Bring Cossistant into your Next.js app with the steps below.
									We included your freshly minted [test] public key so you can
									copy and paste it straight into your environment.
								</p>

								<div className="space-y-3">
									<h4 className="font-medium text-primary text-sm tracking-wide">
										[ Install the package]
									</h4>
									<div className="relative overflow-clip rounded border border-primary/10 bg-background-200 pt-0">
										<CodeBlockCommand
											__bun__="bun add @cossistant/next"
											__npm__="npm install @cossistant/next"
											__pnpm__="pnpm add @cossistant/next"
											__yarn__="yarn add @cossistant/next"
										/>
									</div>
								</div>

								<div className="space-y-3">
									<h4 className="font-medium text-primary text-sm tracking-wide">
										[Add your public key]
									</h4>
									<DashboardCodeBlock
										code={`NEXT_PUBLIC_COSSISTANT_API_KEY=${publicApiKey ?? "pk_test_replace_me"}`}
										fileName=".env.local"
										language="bash"
									/>
									{publicApiKey ? null : (
										<p className="text-destructive text-xs">
											We couldn't load your key automatically. Grab it from
											Settings → Developers.
										</p>
									)}
								</div>

								<div className="space-y-3">
									<h4 className="font-medium text-primary text-sm tracking-wide">
										[Wrap your root layout]
									</h4>
									<DashboardCodeBlock
										code={`import { SupportProvider } from "@cossistant/next";

import "./globals.css";
import "@cossistant/react/support.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SupportProvider>{children}</SupportProvider>
      </body>
    </html>
  );
}
`}
										fileName="app/layout.tsx"
									/>
								</div>

								<div className="space-y-3">
									<h4 className="font-medium text-primary text-sm tracking-wide">
										[Drop the widget anywhere]
									</h4>
									<DashboardCodeBlock
										code={`import { Support } from "@cossistant/next";

export default function Page() {
  return (
    <main>
      <h1>You're ready to chat!</h1>
      <Support />
    </main>
  );
}
`}
										fileName="app/page.tsx"
									/>
								</div>

								<p className="text-muted-foreground">You've reach the end!</p>

								<div className="fixed right-0 bottom-0 left-0 flex items-center justify-center py-3">
									<div className="flex w-full max-w-3xl items-center justify-center gap-2 rounded border bg-background px-6 py-3 shadow dark:bg-background-300">
										<Button asChild>
											<Link href={`/${websiteSetup.website.slug}/inbox`}>
												Open dashboard now
											</Link>
										</Button>
										<Button asChild variant="outline">
											<Link href="/docs/quickstart" target="_blank">
												Read the documentation
											</Link>
										</Button>
									</div>
								</div>
							</>
						) : (
							<div className="rounded-lg border border-primary/40 border-dashed bg-primary/5 px-4 py-3 text-muted-foreground text-sm">
								React installation is coming soon. In the meantime, reach out to
								us and we’ll help you get early access.
							</div>
						)
					) : null}
				</motion.div>
			</Step>
		</Steps>
	);
}
