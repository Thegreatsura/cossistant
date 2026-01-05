"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";

type StepBasicsSummaryProps = {
	name: string;
	sourceUrl: string;
	urlWasProvided: boolean;
	isUrlValid: boolean;
	crawlEnabled: boolean;
	selectedGoals: string[];
	websiteDescription?: string | null;
	onEdit: () => void;
};

export function StepBasicsSummary({
	name,
	sourceUrl,
	urlWasProvided,
	isUrlValid,
	crawlEnabled,
	selectedGoals,
	websiteDescription,
	onEdit,
}: StepBasicsSummaryProps) {
	return (
		<div className="rounded-lg border border-cossistant-green bg-cossistant-green/10 p-4">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1 space-y-2">
					{/* Agent name and URL */}
					<div className="flex items-center gap-2 font-medium text-primary text-sm">
						<p>{name}</p>
						{urlWasProvided && isUrlValid && (
							<p className="flex items-center gap-1.5">
								- Using {new URL(sourceUrl).hostname}
							</p>
						)}
						{!crawlEnabled && (
							<p className="flex items-center gap-1.5">
								- <Icon className="size-3" name="help" />
								Manual setup
							</p>
						)}
					</div>

					{/* Summary row with goals only (pages available removed) */}
					{selectedGoals.length > 0 && (
						<div className="mt-4 flex flex-wrap items-center gap-3 text-primary text-xs">
							<span className="flex items-center gap-1">
								<Icon className="size-3" name="star" />
								{selectedGoals.length} goal
								{selectedGoals.length !== 1 ? "s" : ""}
							</span>
						</div>
					)}
				</div>
				<Button
					className="shrink-0"
					onClick={onEdit}
					size="sm"
					type="button"
					variant="ghost"
				>
					Edit
				</Button>
			</div>
		</div>
	);
}
