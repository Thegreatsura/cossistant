"use client";

import { AI_MODELS } from "@cossistant/types";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import Icon, { type IconName } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { PromptInput } from "@/components/ui/prompt-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AnalysisProgress } from "./analysis-progress";
import { ManualDescriptionInput } from "./manual-description-input";
import { PromptGeneratedConfirmation } from "./prompt-generated-confirmation";

type AnalysisStep = "crawling" | "analyzing" | "crafting" | "complete";

type AIModel = {
	readonly value: string;
	readonly label: string;
	readonly icon: string;
	readonly provider: string;
	readonly freeOnly?: boolean;
	readonly requiresPaid?: boolean;
};

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
	availableModels: readonly AIModel[];
	model: string;
	setModel: (model: string) => void;
	basePrompt: string;
	setBasePrompt: (prompt: string) => void;
	isSubmitting: boolean;
	isFreePlan: boolean;
	onFinish: () => void;
	onShowUpgradeModal: () => void;
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
	availableModels,
	model,
	setModel,
	basePrompt,
	setBasePrompt,
	isSubmitting,
	isFreePlan,
	onFinish,
	onShowUpgradeModal,
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
					<div className="space-y-2">
						<Label htmlFor="model-select">AI Model</Label>
						<Select
							disabled={isSubmitting}
							onValueChange={setModel}
							value={model}
						>
							<SelectTrigger id="model-select">
								<SelectValue placeholder="Select a model" />
							</SelectTrigger>
							<SelectContent>
								{availableModels.map((m) => (
									<SelectItem key={m.value} value={m.value}>
										<span className="flex items-center gap-2">
											<Icon
												className="size-4 text-foreground"
												name={m.icon as IconName}
											/>
											<span>{m.label}</span>
											<span className="text-muted-foreground text-xs">
												({m.provider})
											</span>
										</span>
									</SelectItem>
								))}
								{/* Show locked models for free users */}
								{isFreePlan &&
									AI_MODELS.filter(
										(m) => "requiresPaid" in m && m.requiresPaid
									).map((m) => (
										<SelectItem disabled key={m.value} value={m.value}>
											<span className="flex items-center gap-2 opacity-50">
												<Icon
													className="size-4 text-muted-foreground"
													name={m.icon as IconName}
												/>
												<span>{m.label}</span>
												<span className="text-muted-foreground text-xs">
													({m.provider})
												</span>
												<Icon
													className="size-3 text-muted-foreground"
													name="card"
												/>
											</span>
										</SelectItem>
									))}
							</SelectContent>
						</Select>
						<div className="flex items-center justify-between">
							<p className="text-muted-foreground text-xs">
								The AI model powering your agent's responses
							</p>
							{isFreePlan && (
								<button
									className="text-primary text-xs hover:underline"
									onClick={onShowUpgradeModal}
									type="button"
								>
									Upgrade for more models
								</button>
							)}
						</div>
					</div>

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
