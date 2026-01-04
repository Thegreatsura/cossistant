"use client";

import { motion } from "motion/react";
import Icon from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

type AnalysisStep = "crawling" | "analyzing" | "crafting" | "complete";

type AnalysisProgressProps = {
	analysisStep: AnalysisStep;
};

function StepIndicator({
	isActive,
	isComplete,
	isPending,
}: {
	isActive: boolean;
	isComplete: boolean;
	isPending: boolean;
}) {
	return (
		<div className="flex size-5 items-center justify-center">
			{isPending ? (
				<div className="size-2 rounded-full" />
			) : isActive ? (
				<Spinner className="size-4 text-primary" />
			) : isComplete ? (
				<motion.div animate={{ scale: 1 }} initial={{ scale: 0 }}>
					<Icon className="size-4 text-cossistant-green" name="check" />
				</motion.div>
			) : null}
		</div>
	);
}

export function AnalysisProgress({ analysisStep }: AnalysisProgressProps) {
	const steps = [
		{
			id: "crawling",
			label: "Crawling your website...",
		},
		{
			id: "analyzing",
			label: "Analyzing what your business does...",
		},
		{
			id: "crafting",
			label: "Crafting personalized prompt...",
		},
	] as const;

	const stepOrder = ["crawling", "analyzing", "crafting"] as const;

	const getStepState = (stepId: (typeof stepOrder)[number]) => {
		const currentIndex = stepOrder.indexOf(
			analysisStep as (typeof stepOrder)[number]
		);
		const stepIndex = stepOrder.indexOf(stepId);

		return {
			isActive: analysisStep === stepId,
			isComplete: stepIndex < currentIndex,
			isPending: stepIndex > currentIndex,
		};
	};

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="rounded-md border border-primary/10 p-4"
			initial={{ opacity: 0, y: -10 }}
		>
			<div className="space-y-3">
				{steps.map((step) => {
					const state = getStepState(step.id);
					return (
						<div className="flex items-center gap-3" key={step.id}>
							<StepIndicator {...state} />
							<span
								className={`text-sm ${
									state.isActive
										? "font-medium text-foreground"
										: state.isPending
											? "text-muted-foreground/50"
											: "text-muted-foreground"
								}`}
							>
								{step.label}
							</span>
						</div>
					);
				})}
			</div>
		</motion.div>
	);
}
