import { SupportConfig } from "@cossistant/react/support-config";
import Link from "next/link";
import { Suspense } from "react";
import { FakeDashboard } from "@/components/landing/fake-dashboard";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { Logos } from "@/components/ui/logos";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { Benefits } from "./components/benefits";
import { BrowserWithBackground } from "./components/browser-with-background";
import { GitHubLink } from "./components/github-link";
import { WaitingListMessage } from "./components/waiting-list-rank/message";

export const dynamic = "force-dynamic";

export default async function Landing() {
	return (
		<>
			<SupportConfig
				defaultMessages={[
					{
						content: "Hi, liking Cossistant so far? How can I help you today?",
						senderType: "team_member",
					},
				]}
			/>
			<div className="flex min-h-screen flex-col gap-8 pt-32 md:flex-row">
				<div className="flex flex-1 flex-col gap-6">
					{/* <EscapeIframeAnimation /> */}
					<div className="flex flex-col items-start gap-4 px-4 pb-8">
						<h1 className="text-pretty text-center font-f37-stout text-[36px] leading-tight md:text-3xl lg:text-left xl:text-5xl">
							Ship the best customer support for your SaaS.
						</h1>
						<h3 className="w-full text-center text-base text-primary/70 md:max-w-[75%] md:text-lg lg:max-w-full lg:text-balance lg:text-left">
							Human + AI agent support your users love in under 10 lines of
							code.
						</h3>
						<div className="mt-6 flex w-full flex-col gap-3 md:max-w-[75%] md:gap-6 lg:max-w-full lg:flex-row lg:items-center">
							<Link href="/waitlist">
								<Button className="h-12 w-full border border-transparent font-medium text-md has-[>svg]:px-4 lg:w-[250px]">
									Join the waitlist
								</Button>
							</Link>
							<GitHubLink
								className="h-12 w-full justify-between px-4 font-medium text-md lg:w-[250px]"
								variant="ghost"
							>
								Star us on GitHub
							</GitHubLink>
						</div>
						<Suspense
							fallback={
								<p className="text-balance text-center font-mono text-foreground/20 text-xs md:text-left">
									Already xxx people on the waitlist. Join them, be early.
								</p>
							}
						>
							<WaitingListMessage />
						</Suspense>
					</div>
					<BrowserWithBackground containerClassName="w-full border-primary/10 border-y border-dashed">
						<div className="fake-dashboard-container">
							<FakeDashboard />
						</div>
					</BrowserWithBackground>
					<div className="mt-10 flex w-full items-center justify-center gap-2 px-6 lg:mt-auto lg:justify-between lg:px-4">
						<div className="flex items-center gap-2">
							<p className="font-mono text-foreground/60 text-xs">
								Works well with
							</p>
							<TooltipOnHover content="React">
								<Link href="https://react.dev" target="_blank">
									<Logos.react className="size-4" />
								</Link>
							</TooltipOnHover>
							<TooltipOnHover content="Next.js">
								<Link href="https://nextjs.org" target="_blank">
									<Logos.nextjs className="size-4" />
								</Link>
							</TooltipOnHover>
							<TooltipOnHover content="Tailwind">
								<Link href="https://tailwindcss.com" target="_blank">
									<Logos.tailwind className="size-4" />
								</Link>
							</TooltipOnHover>
							<TooltipOnHover content="Shadcn/UI">
								<Link href="https://ui.shadcn.com" target="_blank">
									<Logos.shadcn className="size-4" />
								</Link>
							</TooltipOnHover>
						</div>
						<div className="flex w-max gap-2">
							<Button
								className="border-primary/10 border-dashed bg-background-200 dark:bg-background-400"
								size="sm"
								type="button"
								variant="outline"
							>
								Support inbox
							</Button>
							<Button size="sm" type="button" variant="secondary">
								Real-time conversation
							</Button>
							<Button
								className="size-8"
								size="icon"
								type="button"
								variant="secondary"
							>
								<Icon className="size-4" filledOnHover name="play" />
							</Button>
						</div>
					</div>
				</div>
			</div>
			<Benefits />
		</>
	);
}
