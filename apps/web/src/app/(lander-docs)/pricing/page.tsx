import {
	FEATURE_CONFIG,
	type FeatureCategory,
	type FeatureKey,
	type FeatureValue,
	PLAN_CONFIG,
} from "@api/lib/plans/config";
import { Check, Info, Tag, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipOnHover } from "@/components/ui/tooltip";

export const metadata: Metadata = {
	title: "Pricing - Cossistant",
	description: "Simple, transparent pricing for your customer support needs.",
};

const FeatureHeader = ({ featureKey }: { featureKey: FeatureKey }) => {
	const featureConfig = FEATURE_CONFIG[featureKey];
	const displayName = featureConfig.name;
	const description = featureConfig.description;

	return (
		<li className="z-0 flex h-12 items-center gap-2 border-primary/10 border-b border-dashed px-6 last-of-type:border-transparent">
			<TooltipOnHover content={description}>
				<button
					className="group flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
					type="button"
				>
					<span className="border-primary/30 border-b border-dashed group-hover:border-primary/50">
						{displayName}
					</span>
					<Info className="size-3 opacity-50 group-hover:opacity-70" />
				</button>
			</TooltipOnHover>
		</li>
	);
};

const FeatureCell = ({
	featureKey,
	value,
}: {
	featureKey: FeatureKey;
	value: FeatureValue;
}) => {
	const featureConfig = FEATURE_CONFIG[featureKey];
	const displayName = featureConfig.name;
	const isComingSoon = featureConfig.comingSoon;
	const unit = featureConfig.unit;

	// Determine what to display based on the value type
	let displayValue: ReactNode;
	let icon: ReactNode;

	if (typeof value === "boolean") {
		// Boolean features show check/x
		icon = value ? (
			<Check className="h-4 w-4 text-primary" />
		) : (
			<X className="h-4 w-4 text-muted-foreground" />
		);
		displayValue = null;
	} else if (typeof value === "number") {
		// Numeric features show the number with unit
		icon = <Check className="h-4 w-4 text-primary" />;

		// Format the value based on the unit
		if (unit) {
			// Special formatting for certain units
			if (unit === "days") {
				displayValue = `${value} ${unit}`;
			} else if (unit === "MB") {
				displayValue = `${value} MB`;
			} else if (unit === "seats") {
				displayValue = value === 1 ? `${value} seat` : `${value} seats`;
			} else if (unit === "agents") {
				displayValue = value === 1 ? `${value} agent` : `${value} agents`;
			} else if (unit === "links") {
				displayValue = `${value} links`;
			} else if (unit.includes("/month")) {
				// Format large numbers with commas for monthly limits
				const formattedValue = value.toLocaleString();
				displayValue = formattedValue;
			} else {
				displayValue = `${value} ${unit}`;
			}
		} else {
			displayValue = value.toLocaleString();
		}
	} else if (value === null) {
		// Null means unlimited
		icon = <Check className="h-4 w-4 text-primary" />;
		displayValue = "Unlimited";
	}

	return (
		<li className="flex h-12 items-center gap-2 border-primary/10 border-b border-dashed px-6 last-of-type:border-transparent">
			{icon}
			<span className="flex w-full items-center justify-between gap-2 pl-2 text-primary">
				{displayValue && <span className="text-primary">{displayValue}</span>}
				{isComingSoon && (
					<Badge className="ml-auto text-xs opacity-45" variant="secondary">
						Coming Soon
					</Badge>
				)}
			</span>
		</li>
	);
};

export default function PricingPage() {
	const plans = [PLAN_CONFIG.free, PLAN_CONFIG.hobby, PLAN_CONFIG.pro];

	// Group features by category
	const groupFeaturesByCategory = (
		features: Record<FeatureKey, FeatureValue>
	) => {
		const primary: [FeatureKey, FeatureValue][] = [];
		const secondary: [FeatureKey, FeatureValue][] = [];

		for (const [key, value] of Object.entries(features)) {
			const featureConfig = FEATURE_CONFIG[key as FeatureKey];
			if (featureConfig.category === "primary") {
				primary.push([key as FeatureKey, value]);
			} else {
				secondary.push([key as FeatureKey, value]);
			}
		}

		return { primary, secondary };
	};

	return (
		<div className="flex flex-col pt-40 pb-60">
			<div className="mx-auto max-w-2xl text-center">
				<h1 className="font-f37-stout text-4xl leading-tight md:text-6xl">
					Pricing
				</h1>
				<h2 className="mt-4 text-lg text-muted-foreground">
					Integrate for free and scale as you grow.
				</h2>
			</div>

			{/* Launch Promotion Banner */}
			{(PLAN_CONFIG.hobby.priceWithPromo || PLAN_CONFIG.pro.priceWithPromo) && (
				<div className="mx-auto mt-10 max-w-4xl border border-cossistant-orange/30 border-dashed bg-cossistant-orange/5 p-2 text-center">
					<div className="flex flex-col items-center justify-center gap-2">
						<h3 className="flex items-center gap-2 text-cossistant-orange text-sm">
							Limited launch offer on all our plans – up to{" "}
							<span className="font-bold text-cossistant-orange">
								{Math.max(
									PLAN_CONFIG.hobby.priceWithPromo && PLAN_CONFIG.hobby.price
										? Math.round(
												((PLAN_CONFIG.hobby.price -
													PLAN_CONFIG.hobby.priceWithPromo) /
													PLAN_CONFIG.hobby.price) *
													100
											)
										: 0,
									PLAN_CONFIG.pro.priceWithPromo && PLAN_CONFIG.pro.price
										? Math.round(
												((PLAN_CONFIG.pro.price -
													PLAN_CONFIG.pro.priceWithPromo) /
													PLAN_CONFIG.pro.price) *
													100
											)
										: 0
								)}
								% off
							</span>
						</h3>
					</div>
				</div>
			)}

			{/* Pricing Cards */}
			<div className="mt-14 grid border-primary/10 border-y border-dashed md:grid-cols-4">
				<div className="flex flex-col border-primary/10 border-r border-dashed last-of-type:border-r-0">
					<div className="sticky top-18 z-1 h-[233px] w-full border-primary/10 border-b border-dashed bg-background" />
					<div className="flex-1 pt-0">
						{(() => {
							const { primary, secondary } = groupFeaturesByCategory(
								PLAN_CONFIG.free.features
							);

							return (
								<>
									{/* Primary Features */}
									<ul>
										{primary.map(([key, value]) => (
											<FeatureHeader featureKey={key} key={key} />
										))}
									</ul>

									{/* Secondary Features */}
									{secondary.length > 0 && (
										<>
											<div className="mt-16 px-6 py-2">
												<span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
													Advanced Features
												</span>
											</div>
											<ul>
												{secondary.map(([key, value]) => (
													<FeatureHeader featureKey={key} key={key} />
												))}
											</ul>
										</>
									)}
								</>
							);
						})()}
					</div>
				</div>
				{plans.map((plan) => (
					<div
						className="flex flex-col border-primary/10 border-r border-dashed last-of-type:border-r-0"
						key={plan.name}
					>
						<div className="sticky top-18 z-10 flex flex-col space-y-1.5 border-primary/10 border-b border-dashed bg-background p-6">
							<div className="flex gap-2">
								<h3 className="font-medium text-2xl leading-none tracking-tight">
									{plan.displayName}
								</h3>
								{plan.isRecommended && (
									<p className="z-0 font-medium text-cossistant-orange text-xs">
										Recommended
									</p>
								)}
							</div>
							<p className="h-18 text-muted-foreground text-sm">
								{plan.name === "free"
									? "Perfect for getting started"
									: plan.name === "hobby"
										? "For growing teams"
										: "For teams with advanced needs"}
							</p>
							<div className="mt-10">
								{plan.priceWithPromo && plan.price !== plan.priceWithPromo ? (
									<div className="flex items-baseline gap-2">
										<span className="font-f37-stout font-semibold text-3xl text-cossistant-orange">
											${plan.priceWithPromo}
										</span>
										<span className="relative font-f37-stout text-base text-muted-foreground">
											${plan.price}
										</span>
										<span className="text-muted-foreground text-sm">
											/month
										</span>
									</div>
								) : (
									<>
										<span className="font-f37-stout font-semibold text-3xl">
											${plan.price ?? 0}
										</span>
										<span className="text-muted-foreground text-sm">
											/month
										</span>
									</>
								)}
							</div>
						</div>
						<div className="flex-1 pt-0">
							{(() => {
								const { primary, secondary } = groupFeaturesByCategory(
									plan.features
								);
								return (
									<>
										{/* Primary Features */}
										<ul>
											{primary.map(([key, value]) => (
												<FeatureCell featureKey={key} key={key} value={value} />
											))}
										</ul>

										{/* Secondary Features */}
										{secondary.length > 0 && (
											<>
												<div className="mt-16 px-6 py-2">
													<span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
														Advanced Features
													</span>
												</div>
												<ul>
													{secondary.map(([key, value]) => (
														<FeatureCell
															featureKey={key}
															key={key}
															value={value}
														/>
													))}
												</ul>
											</>
										)}
									</>
								);
							})()}
						</div>
						<div className="flex items-center px-6 pt-10 pb-6">
							<Button asChild className="w-full" variant="outline">
								<Link
									href={
										plan.name === "free"
											? "/sign-up"
											: `/sign-up?plan=${plan.name}`
									}
								>
									Get started
								</Link>
							</Button>
						</div>
					</div>
				))}
			</div>

			{/* FAQ Section */}
			<div className="mx-auto mt-24 max-w-3xl">
				<h2 className="mb-8 text-center font-bold text-3xl">
					Frequently Asked Questions
				</h2>
				<Accordion className="w-full" collapsible type="single">
					<AccordionItem value="item-1">
						<AccordionTrigger>Can I self-host Cossistant?</AccordionTrigger>
						<AccordionContent>
							Yes! Cossistant is open source. You can self-host it on your own
							infrastructure. Check out our GitHub repository for instructions.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-2">
						<AccordionTrigger>
							What happens if I exceed my limits?
						</AccordionTrigger>
						<AccordionContent>
							We'll notify you when you're close to your limits. If you exceed
							them, we won't cut you off immediately, but we'll ask you to
							upgrade to a higher plan to continue using the service without
							interruption.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-3">
						<AccordionTrigger>
							Do you offer enterprise support?
						</AccordionTrigger>
						<AccordionContent>
							Yes, for enterprise needs including custom integrations, SLAs, and
							dedicated support, please contact our sales team.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="item-4">
						<AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
						<AccordionContent>
							Absolutely. You can cancel your subscription at any time. Your
							access will continue until the end of your current billing period.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}
