"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { motion } from "motion/react";
import { ModelSelect } from "@/components/agents/model-select";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { PromptInput } from "@/components/ui/prompt-input";
import { Spinner } from "@/components/ui/spinner";
import { AnalysisProgress } from "./analysis-progress";
import { ManualDescriptionInput } from "./manual-description-input";
import { PromptGeneratedConfirmation } from "./prompt-generated-confirmation";

type AnalysisStep = "crawling" | "analyzing" | "crafting" | "complete";

type StepPersonalityProps = {
	isAnalyzing: boolean;
	urlWasProvided: boolean;
	analysisStep: AnalysisStep;
	promptWasGenerated: boolean;
	generatedPromptData?: {
		companyName?: string | null;
		websiteDescription?: string | null;
		discoveredLinksCount?: number;
	};
	manualDescription: string;
	setManualDescription: (description: string) => void;
	crawlEnabled: boolean;
	needsManualDescription: boolean;
	onGenerateWithDescription: () => void;
	shouldShowPromptEditor: boolean;
	model: string;
	setModel: (model: string) => void;
	basePrompt: string;
	setBasePrompt: (prompt: string) => void;
	isSubmitting: boolean;
	isFreePlan: boolean;
	onFinish: () => void;
	websiteSlug: string;
	planInfo: RouterOutputs["plan"]["getPlanInfo"] | undefined;
};

export function StepPersonality({
	isAnalyzing,
	urlWasProvided,
	analysisStep,
	promptWasGenerated,
	generatedPromptData,
	manualDescription,
	setManualDescription,
	crawlEnabled,
	needsManualDescription,
	onGenerateWithDescription,
	shouldShowPromptEditor,
	model,
	setModel,
	basePrompt,
	setBasePrompt,
	isSubmitting,
	isFreePlan,
	onFinish,
	websiteSlug,
	planInfo,
}: StepPersonalityProps) {
	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="mt-4 space-y-6"
			initial={{ opacity: 0, y: 10 }}
			transition={{ duration: 0.3, delay: 0.1 }}
		>
			{/* Analyzing Website Progress - only show when crawling */}
			{isAnalyzing && urlWasProvided && (
				<AnalysisProgress analysisStep={analysisStep} />
			)}

			{/* Generated Prompt Confirmation */}
			{!isAnalyzing && promptWasGenerated && (
				<PromptGeneratedConfirmation
					companyName={generatedPromptData?.companyName ?? undefined}
					discoveredLinksCount={generatedPromptData?.discoveredLinksCount}
					manualDescription={manualDescription}
					websiteDescription={
						generatedPromptData?.websiteDescription ?? undefined
					}
				/>
			)}

			{/* Manual Description Input - shown when no crawl or when crawl didn't find description */}
			{needsManualDescription && (
				<ManualDescriptionInput
					crawlEnabled={crawlEnabled}
					isAnalyzing={isAnalyzing}
					manualDescription={manualDescription}
					onGenerate={onGenerateWithDescription}
					setManualDescription={setManualDescription}
					urlWasProvided={urlWasProvided}
				/>
			)}

			{/* Model Selection and Prompt Editor - only show after prompt is generated */}
			{shouldShowPromptEditor && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="space-y-6"
					initial={{ opacity: 0, y: 10 }}
					transition={{ duration: 0.3 }}
				>
					{/* Model Selection */}
					<ModelSelect
						description="The AI model powering your agent's responses"
						disabled={isSubmitting}
						isFreePlan={isFreePlan}
						label="AI Model"
						onChange={setModel}
						planInfo={planInfo}
						value={model}
						websiteSlug={websiteSlug}
					/>

					{/* Base Prompt */}
					<div className="space-y-2">
						<PromptInput
							description="Define how your AI agent should behave and respond to visitors"
							disabled={isSubmitting}
							label="System Prompt"
							maxLength={10_000}
							onChange={setBasePrompt}
							placeholder="You are a helpful assistant..."
							rows={10}
							value={basePrompt}
						/>
					</div>

					{/* Finish Button */}
					<div className="flex justify-end pt-2">
						<Button
							disabled={isSubmitting || !basePrompt.trim()}
							onClick={onFinish}
							type="button"
						>
							{isSubmitting ? (
								<>
									<Spinner className="mr-2 size-4" />
									Creating agent...
								</>
							) : (
								<>
									Finish Setup
									<Icon className="ml-2 size-4" name="check" />
								</>
							)}
						</Button>
					</div>
				</motion.div>
			)}
		</motion.div>
	);
}
