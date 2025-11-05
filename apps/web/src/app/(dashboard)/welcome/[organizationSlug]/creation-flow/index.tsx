"use client";

import {
        APIKeyType,
        type CreateWebsiteResponse,
        WebsiteInstallationTarget,
} from "@cossistant/types";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "motion/react";
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
                                        installationTarget:
                                                variables.installationTarget,
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
                                (key) => key.keyType === APIKeyType.PUBLIC
                        )?.key ?? null
                );
        }, [websiteSetup]);

        const isNextInstallation =
                websiteSetup?.installationTarget ===
                WebsiteInstallationTarget.NEXTJS;

        return (
                <Steps
                        className="mt-10"
                        interactive
                >
                        <Step completed={Boolean(websiteSetup)}>
                                <div className="text-lg font-semibold">
                                        Create your website
                                </div>
                                <motion.div
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-3 space-y-4"
                                        initial={{ opacity: 0, y: 10 }}
                                        transition={{ duration: 0.5, delay: 0.4 }}
                                >
                                        <p className="text-muted-foreground text-sm">
                                                Search for your welcome page so we can set up
                                                the correct organization and domain for your
                                                team.
                                        </p>

                                        {websiteSetup ? (
                                                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                                                        <p className="font-medium text-primary">
                                                                {websiteSetup.website.name} is ready.
                                                        </p>
                                                        <p className="text-muted-foreground">
                                                                We generated your default API keys and
                                                                allowed localhost so you can start building
                                                                immediately.
                                                        </p>
                                                </div>
                                        ) : (
                                                <WebsiteCreationForm
                                                        isSubmitting={isSubmitting}
                                                        onSubmit={createWebsite}
                                                        organizationId={organizationId}
                                                />
                                        )}
                                </motion.div>
                        </Step>

                        <Step enabled={Boolean(websiteSetup)}>
                                <div className="text-lg font-semibold">
                                        Install Cossistant
                                </div>
                                <motion.div
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-3 space-y-6"
                                        initial={{ opacity: 0, y: 10 }}
                                        transition={{ duration: 0.5, delay: 0.7 }}
                                >
                                        {!websiteSetup ? null : isNextInstallation ? (
                                                <>
                                                        <p className="text-muted-foreground text-sm">
                                                                Bring Cossistant into your Next.js app with
                                                                the steps below. We included your freshly
                                                                minted public key so you can copy and paste it
                                                                straight into your environment.
                                                        </p>

                                                        <div className="space-y-3">
                                                                <h4 className="font-medium text-sm uppercase tracking-wide text-primary">
                                                                        Install the SDK
                                                                </h4>
                                                                <CodeBlockCommand
                                                                        __bun__="bun add @cossistant/next"
                                                                        __npm__="npm install @cossistant/next"
                                                                        __pnpm__="pnpm add @cossistant/next"
                                                                        __yarn__="yarn add @cossistant/next"
                                                                />
                                                        </div>

                                                        <div className="space-y-3">
                                                                <h4 className="font-medium text-sm uppercase tracking-wide text-primary">
                                                                        Add your public key
                                                                </h4>
                                                                <DashboardCodeBlock
                                                                        code={`NEXT_PUBLIC_COSSISTANT_API_KEY=${publicApiKey ?? "pk_test_replace_me"}`}
                                                                        fileName=".env.local"
                                                                        language="bash"
                                                                />
                                                                {!publicApiKey ? (
                                                                        <p className="text-destructive text-xs">
                                                                                We couldn't load your key automatically.
                                                                                Grab it from Settings → Developers.
                                                                        </p>
                                                                ) : null}
                                                        </div>

                                                        <div className="space-y-3">
                                                                <h4 className="font-medium text-sm uppercase tracking-wide text-primary">
                                                                        Wrap your layout
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
                                                                <h4 className="font-medium text-sm uppercase tracking-wide text-primary">
                                                                        Drop the widget anywhere
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

                                                        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm">
                                                                <p className="font-medium">
                                                                        Ready for the next step?
                                                                </p>
                                                                <p className="text-muted-foreground">
                                                                        Open the dashboard to finish customizing your
                                                                        support experience.
                                                                </p>
                                                                <div>
                                                                        <Button asChild size="sm">
                                                                                <Link href="/select">
                                                                                        Open dashboard
                                                                                </Link>
                                                                        </Button>
                                                                </div>
                                                        </div>
                                                </>
                                        ) : (
                                                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                                                        React installation is coming soon. In the meantime,
                                                        reach out to us and we’ll help you get early access.
                                                </div>
                                        )}
                                </motion.div>
                        </Step>
                </Steps>
        );
}
