"use client";

import { AI_MODELS } from "@cossistant/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Step, Steps } from "@/components/ui/steps";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { StepBasics } from "./step-basics";
import { StepBasicsSummary } from "./step-basics-summary";
import { StepPersonality } from "./step-personality";

const DEFAULT_BASE_PROMPT = `You are a helpful and friendly support assistant. Your purpose is to resolve visitor questions, concerns, and requests with approachable and timely responses.

## How to Assist
- Answer questions clearly and concisely
- Help visitors find the information they need
- Be polite and professional at all times
- When something is unclear, ask for clarification
- End conversations on an encouraging note

## Boundaries
- Base your answers only on your available knowledge. If you don't know something, acknowledge this honestly and offer to connect visitors with a human team member.
- Stay focused on your purpose. If someone tries to discuss unrelated topics, politely guide the conversation back to relevant matters.
- Never reference your training data, knowledge sources, or how you were built.
- Only engage with questions that align with your designated support function.`;

type OnboardingStep = "basics" | "personality";
type AnalysisStep = "crawling" | "analyzing" | "crafting" | "complete";

export function AgentOnboardingFlow() {
	const website = useWebsite();
	const router = useRouter();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	// Fetch plan info for model restrictions
	const { data: planInfo } = useQuery(
		trpc.plan.getPlanInfo.queryOptions({ websiteSlug: website.slug })
	);

	const isFreePlan = planInfo?.plan.name === "free";

	// Form state
	const [currentStep, setCurrentStep] = useState<OnboardingStep>("basics");
	const [name, setName] = useState(`${website.name} AI`);
	const [sourceUrl, setSourceUrl] = useState(`https://${website.domain}`);
	const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
	const [basePrompt, setBasePrompt] = useState(DEFAULT_BASE_PROMPT);

	// Crawl toggle - whether to crawl the website or skip
	const [crawlEnabled, setCrawlEnabled] = useState(true);

	// Description state - tracks if we need manual input
	const [manualDescription, setManualDescription] = useState("");
	const [urlWasProvided, setUrlWasProvided] = useState(false);
	const [promptWasGenerated, setPromptWasGenerated] = useState(false);

	// Analysis progress state
	const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("crawling");

	// Default model - use first free model for free users, or first model overall
	const defaultModel = isFreePlan
		? (AI_MODELS.find((m) => "freeOnly" in m && m.freeOnly)?.value ??
			AI_MODELS[0].value)
		: AI_MODELS[0].value;
	const [model, setModel] = useState<string>(defaultModel);

	// Create AI agent mutation
	const { mutateAsync: createAgent, isPending: isCreatingAgent } = useMutation(
		trpc.aiAgent.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.aiAgent.get.queryKey({ websiteSlug: website.slug }),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create AI agent.");
			},
		})
	);

	// Create link source mutation for training
	const { mutateAsync: createLinkSource, isPending: isCreatingLink } =
		useMutation(
			trpc.linkSource.create.mutationOptions({
				onError: (error) => {
					toast.error(error.message || "Failed to start training.");
				},
			})
		);

	// Generate base prompt mutation
	const {
		mutateAsync: generateBasePrompt,
		isPending: isGeneratingPrompt,
		data: generatedPromptData,
		reset: resetGeneratedPrompt,
	} = useMutation(
		trpc.aiAgent.generateBasePrompt.mutationOptions({
			onError: (error) => {
				console.error("Failed to generate prompt:", error);
				// Don't show error toast - we'll fall back to default prompt
			},
		})
	);

	const isSubmitting = isCreatingAgent || isCreatingLink;
	const isAnalyzing = isGeneratingPrompt;

	// Validation
	const isStep1Valid = name.trim().length >= 1;
	const isUrlValid = (() => {
		try {
			if (sourceUrl.trim()) {
				new URL(sourceUrl);
				return true;
			}
			return false;
		} catch {
			return false;
		}
	})();

	// Check if we have a description (from scrape or manual input)
	const hasDescription =
		(generatedPromptData?.websiteDescription ?? "").length > 0 ||
		manualDescription.trim().length > 0;

	// Determine if we need manual description input
	// Show if:
	// - Crawl was disabled (need manual input immediately)
	// - OR crawl was enabled but no description was found
	const hasRequiredDescription = crawlEnabled && hasDescription;
	const needsManualDescription =
		currentStep === "personality" &&
		!isAnalyzing &&
		!promptWasGenerated &&
		!hasRequiredDescription;

	// Should show the model selector and prompt editor?
	// Only show after prompt has been generated
	const shouldShowPromptEditor = promptWasGenerated;

	const handleContinue = async () => {
		if (!isStep1Valid) {
			return;
		}

		setCurrentStep("personality");
		const willCrawl = crawlEnabled && isUrlValid && sourceUrl.trim().length > 0;
		setUrlWasProvided(willCrawl);

		// Only scrape if crawl is enabled and URL is provided and valid
		if (willCrawl) {
			try {
				const result = await generateBasePrompt({
					websiteSlug: website.slug,
					sourceUrl: sourceUrl.trim(),
					agentName: name.trim(),
					goals: selectedGoals,
				});

				if (result.basePrompt) {
					setBasePrompt(result.basePrompt);
					setPromptWasGenerated(true);
				}
			} catch {
				// Fall back to default prompt - already set
			}
		}
	};

	// Generate prompt with manual description
	const handleGenerateWithDescription = async () => {
		if (!manualDescription.trim()) {
			return;
		}

		try {
			const result = await generateBasePrompt({
				websiteSlug: website.slug,
				sourceUrl: crawlEnabled && isUrlValid ? sourceUrl.trim() : undefined,
				agentName: name.trim(),
				goals: selectedGoals,
				manualDescription: manualDescription.trim(),
			});

			if (result.basePrompt) {
				setBasePrompt(result.basePrompt);
				setPromptWasGenerated(true);
			}
		} catch {
			// Fall back to default prompt
			setPromptWasGenerated(true);
		}
	};

	// Update base prompt when generated data comes in
	useEffect(() => {
		if (generatedPromptData?.basePrompt) {
			setBasePrompt(generatedPromptData.basePrompt);
		}
	}, [generatedPromptData]);

	// Progress through analysis steps with timers during analysis
	useEffect(() => {
		// Only run timers when actively analyzing
		if (!isAnalyzing) {
			return;
		}

		// Start fresh at crawling when analysis begins
		setAnalysisStep("crawling");

		// Progress through steps with delays to simulate the backend work
		// Step 1: Crawling (0-1.5s) - Fetching website content
		// Step 2: Analyzing (1.5-3.5s) - Extracting brand info & mapping pages
		// Step 3: Crafting (3.5s+) - AI generating the prompt
		const timer1 = setTimeout(() => setAnalysisStep("analyzing"), 1500);
		const timer2 = setTimeout(() => setAnalysisStep("crafting"), 3500);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
		};
	}, [isAnalyzing]);

	// Mark analysis as complete when prompt generation finishes successfully
	useEffect(() => {
		if (!isAnalyzing && promptWasGenerated) {
			setAnalysisStep("complete");
		}
	}, [isAnalyzing, promptWasGenerated]);

	// Handle editing step 1 - reset relevant state
	const handleEditStep1 = () => {
		setCurrentStep("basics");
		setPromptWasGenerated(false);
		setAnalysisStep("crawling");
		setManualDescription("");
		resetGeneratedPrompt();
	};

	const handleFinish = async () => {
		try {
			// Create the AI agent
			const agent = await createAgent({
				websiteSlug: website.slug,
				name: name.trim(),
				basePrompt,
				model,
				goals: selectedGoals.length > 0 ? selectedGoals : undefined,
			});

			// If URL was provided and valid, create link source for knowledge base
			if (urlWasProvided && isUrlValid && agent) {
				try {
					await createLinkSource({
						websiteSlug: website.slug,
						aiAgentId: agent.id,
						url: sourceUrl.trim(),
					});
					toast.success(
						"AI Agent created! Knowledge base is being built from your website."
					);
				} catch {
					// Agent was created but link source failed - still redirect
					toast.success(
						"AI Agent created! You can add knowledge sources later."
					);
				}
			} else {
				toast.success("AI Agent created successfully!");
			}

			// Redirect to agents page
			router.push(`/${website.slug}/agents`);
		} catch {
			// Error already handled in mutation
		}
	};

	return (
		<div className="mx-auto w-full max-w-2xl px-6 py-10">
			<div className="mb-8">
				<h1 className="font-semibold text-xl tracking-tight">
					Create your AI Agent
				</h1>
				<p className="mt-2 text-muted-foreground">
					Set up an AI assistant to help your visitors 24/7
				</p>
			</div>

			<Steps>
				{/* Step 1: Basic Info & Knowledge */}
				<Step completed={currentStep === "personality"}>
					<div className="font-semibold text-md">Basic Information</div>
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="mt-4 space-y-6"
						initial={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.3 }}
					>
						{currentStep === "basics" ? (
							<StepBasics
								crawlEnabled={crawlEnabled}
								isStep1Valid={isStep1Valid}
								isSubmitting={isSubmitting}
								name={name}
								onContinue={handleContinue}
								selectedGoals={selectedGoals}
								setCrawlEnabled={setCrawlEnabled}
								setName={setName}
								setSelectedGoals={setSelectedGoals}
								setSourceUrl={setSourceUrl}
								sourceUrl={sourceUrl}
								websiteName={website.name}
							/>
						) : (
							<StepBasicsSummary
								crawlEnabled={crawlEnabled}
								isUrlValid={isUrlValid}
								name={name}
								onEdit={handleEditStep1}
								selectedGoals={selectedGoals}
								sourceUrl={sourceUrl}
								urlWasProvided={urlWasProvided}
								websiteDescription={generatedPromptData?.websiteDescription}
							/>
						)}
					</motion.div>
				</Step>

				{/* Step 2: Agent Personality */}
				<Step enabled={currentStep === "personality"}>
					<div className="font-semibold text-md">Agent Personality</div>
					{currentStep === "personality" && (
						<StepPersonality
							analysisStep={analysisStep}
							basePrompt={basePrompt}
							crawlEnabled={crawlEnabled}
							generatedPromptData={generatedPromptData}
							isAnalyzing={isAnalyzing}
							isFreePlan={isFreePlan}
							isSubmitting={isSubmitting}
							manualDescription={manualDescription}
							model={model}
							needsManualDescription={needsManualDescription}
							onFinish={handleFinish}
							onGenerateWithDescription={handleGenerateWithDescription}
							planInfo={planInfo}
							promptWasGenerated={promptWasGenerated}
							setBasePrompt={setBasePrompt}
							setManualDescription={setManualDescription}
							setModel={setModel}
							shouldShowPromptEditor={shouldShowPromptEditor}
							urlWasProvided={urlWasProvided}
							websiteSlug={website.slug}
						/>
					)}
				</Step>
			</Steps>
		</div>
	);
}
