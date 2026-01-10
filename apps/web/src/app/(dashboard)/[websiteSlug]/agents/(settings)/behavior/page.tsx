"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
} from "@/components/ui/layout/settings-layout";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";

/**
 * AI Agent Behavior Settings
 */
type BehaviorFormData = {
	// Response triggers
	responseMode: "always" | "when_no_human" | "on_mention" | "manual";
	responseDelayMs: number;

	// Human interaction
	pauseOnHumanReply: boolean;
	pauseDurationMinutes: number | null;

	// Capability toggles
	canResolve: boolean;
	canMarkSpam: boolean;
	canAssign: boolean;
	canSetPriority: boolean;
	canCategorize: boolean;
	canEscalate: boolean;

	// Escalation config
	autoAssignOnEscalation: boolean;

	// Background analysis
	autoAnalyzeSentiment: boolean;
	autoGenerateTitle: boolean;
	autoCategorize: boolean;
};

const defaultSettings: BehaviorFormData = {
	responseMode: "always",
	responseDelayMs: 3000,
	pauseOnHumanReply: true,
	pauseDurationMinutes: 60,
	canResolve: true,
	canMarkSpam: false,
	canAssign: true,
	canSetPriority: true,
	canCategorize: true,
	canEscalate: true,
	autoAssignOnEscalation: true,
	autoAnalyzeSentiment: true,
	autoGenerateTitle: true,
	autoCategorize: false,
};

export default function BehaviorPage() {
	const website = useWebsite();
	const router = useRouter();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data: aiAgent, isLoading: isLoadingAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	// Fetch behavior settings
	const {
		data: behaviorSettings,
		isLoading: isLoadingSettings,
		isError: isSettingsError,
	} = useQuery({
		...trpc.aiAgent.getBehaviorSettings.queryOptions({
			websiteSlug: website.slug,
		}),
		enabled: !!aiAgent,
	});

	// Redirect to create page if no agent exists
	useEffect(() => {
		if (!(isLoadingAgent || aiAgent)) {
			router.replace(`/${website.slug}/agents/create`);
		}
	}, [aiAgent, isLoadingAgent, router, website.slug]);

	const form = useForm<BehaviorFormData>({
		defaultValues: defaultSettings,
	});

	// Reset form when settings are loaded
	useEffect(() => {
		if (behaviorSettings) {
			form.reset({
				responseMode: behaviorSettings.responseMode,
				responseDelayMs: behaviorSettings.responseDelayMs,
				pauseOnHumanReply: behaviorSettings.pauseOnHumanReply,
				pauseDurationMinutes: behaviorSettings.pauseDurationMinutes,
				canResolve: behaviorSettings.canResolve,
				canMarkSpam: behaviorSettings.canMarkSpam,
				canAssign: behaviorSettings.canAssign,
				canSetPriority: behaviorSettings.canSetPriority,
				canCategorize: behaviorSettings.canCategorize,
				canEscalate: behaviorSettings.canEscalate,
				autoAssignOnEscalation: behaviorSettings.autoAssignOnEscalation,
				autoAnalyzeSentiment: behaviorSettings.autoAnalyzeSentiment,
				autoGenerateTitle: behaviorSettings.autoGenerateTitle,
				autoCategorize: behaviorSettings.autoCategorize,
			});
		}
	}, [behaviorSettings, form]);

	// Mutation to update settings
	const { mutate: updateSettings, isPending: isSaving } = useMutation(
		trpc.aiAgent.updateBehaviorSettings.mutationOptions({
			onSuccess: () => {
				toast.success("Behavior settings saved successfully");
				// Invalidate the query to refetch settings
				void queryClient.invalidateQueries({
					queryKey: trpc.aiAgent.getBehaviorSettings.queryKey({
						websiteSlug: website.slug,
					}),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to save behavior settings");
			},
		})
	);

	const onSubmit = (data: BehaviorFormData) => {
		if (!aiAgent) {
			toast.error("AI agent not found");
			return;
		}

		updateSettings({
			websiteSlug: website.slug,
			aiAgentId: aiAgent.id,
			settings: data,
		});
	};

	if (!aiAgent || isLoadingAgent) {
		return null;
	}

	const isLoading = isLoadingSettings;

	return (
		<SettingsPage>
			<SettingsHeader>Behavior Settings</SettingsHeader>
			<PageContent className="py-30">
				{isLoading ? (
					<div className="space-y-8">
						<SettingsRow
							description="Loading settings..."
							title="Response Behavior"
						>
							<div className="space-y-6 p-4">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						</SettingsRow>
						<SettingsRow
							description="Loading settings..."
							title="Human Interaction"
						>
							<div className="space-y-6 p-4">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						</SettingsRow>
					</div>
				) : isSettingsError ? (
					<div className="p-8 text-center">
						<p className="text-destructive">
							Failed to load behavior settings. Please try again.
						</p>
						<Button
							className="mt-4"
							onClick={() => window.location.reload()}
							variant="outline"
						>
							Reload Page
						</Button>
					</div>
				) : (
					<Form {...form}>
						<form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
							{/* Response Settings */}
							<SettingsRow
								description="Control when and how the AI agent responds to visitor messages."
								title="Response Behavior"
							>
								<div className="space-y-6 p-4">
									<FormField
										control={form.control}
										name="responseMode"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Response Mode</FormLabel>
												<Select
													defaultValue={field.value}
													onValueChange={field.onChange}
													value={field.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select mode" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value="always">
															Always respond
														</SelectItem>
														<SelectItem value="when_no_human">
															Only when no human is active
														</SelectItem>
														<SelectItem value="on_mention">
															Only when mentioned (@ai)
														</SelectItem>
														<SelectItem value="manual">
															Manual only (commands)
														</SelectItem>
													</SelectContent>
												</Select>
												<FormDescription>
													When should the AI automatically respond to visitors
												</FormDescription>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="responseDelayMs"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Response Delay (seconds)</FormLabel>
												<FormControl>
													<Input
														max={30}
														min={0}
														onChange={(e) =>
															field.onChange(Number(e.target.value) * 1000)
														}
														step={0.5}
														type="number"
														value={field.value / 1000}
													/>
												</FormControl>
												<FormDescription>
													Wait time before responding (makes responses feel more
													natural)
												</FormDescription>
											</FormItem>
										)}
									/>
								</div>
							</SettingsRow>

							{/* Human Interaction */}
							<SettingsRow
								description="Configure how the AI behaves when human agents are involved in conversations."
								title="Human Interaction"
							>
								<div className="space-y-6 p-4">
									<FormField
										control={form.control}
										name="pauseOnHumanReply"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Pause on Human Reply
													</FormLabel>
													<FormDescription>
														Stop AI responses when a human agent replies
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="pauseDurationMinutes"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Pause Duration (minutes)</FormLabel>
												<FormControl>
													<Input
														max={1440}
														min={1}
														onChange={(e) =>
															field.onChange(
																e.target.value ? Number(e.target.value) : null
															)
														}
														placeholder="60"
														type="number"
														value={field.value ?? ""}
													/>
												</FormControl>
												<FormDescription>
													How long to pause after a human reply (leave empty for
													indefinite)
												</FormDescription>
											</FormItem>
										)}
									/>
								</div>
							</SettingsRow>

							{/* Capabilities */}
							<SettingsRow
								description="Enable or disable specific actions the AI can take on conversations."
								title="Capabilities"
							>
								<div className="space-y-4 p-4">
									<FormField
										control={form.control}
										name="canResolve"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Resolve Conversations
													</FormLabel>
													<FormDescription>
														AI can mark conversations as resolved
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="canMarkSpam"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Mark as Spam
													</FormLabel>
													<FormDescription>
														AI can mark conversations as spam
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="canAssign"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Assign Conversations
													</FormLabel>
													<FormDescription>
														AI can assign conversations to team members
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="canSetPriority"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Set Priority
													</FormLabel>
													<FormDescription>
														AI can change conversation priority
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="canCategorize"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Categorize
													</FormLabel>
													<FormDescription>
														AI can add conversations to views
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="canEscalate"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Escalate to Human
													</FormLabel>
													<FormDescription>
														AI can escalate conversations to human agents
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="autoAssignOnEscalation"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Auto-assign on Escalation
													</FormLabel>
													<FormDescription>
														Automatically assign to team when escalating
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</div>
							</SettingsRow>

							{/* Background Analysis */}
							<SettingsRow
								description="Enable automatic analysis that runs silently in the background."
								title="Background Analysis"
							>
								<div className="space-y-4 p-4">
									<FormField
										control={form.control}
										name="autoAnalyzeSentiment"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Analyze Sentiment
													</FormLabel>
													<FormDescription>
														Automatically detect visitor sentiment
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="autoGenerateTitle"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Generate Titles
													</FormLabel>
													<FormDescription>
														Automatically generate conversation titles
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="autoCategorize"
										render={({ field }) => (
											<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
												<div className="space-y-0.5">
													<FormLabel className="text-base">
														Auto-categorize
													</FormLabel>
													<FormDescription>
														Automatically add conversations to matching views
													</FormDescription>
												</div>
												<FormControl>
													<Switch
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</FormControl>
											</FormItem>
										)}
									/>
								</div>
							</SettingsRow>

							{/* Human Commands Info */}
							<SettingsRow
								description="Human agents can command the AI using @ai prefix in messages."
								title="Human Commands"
							>
								<div className="space-y-4 p-4">
									<Card>
										<CardHeader className="pb-2">
											<CardTitle className="text-sm">
												Available Commands
											</CardTitle>
											<CardDescription>
												Type these in the conversation to instruct the AI
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-2">
											<div className="flex items-center gap-2">
												<Badge variant="secondary">@ai summarize this</Badge>
												<span className="text-muted-foreground text-sm">
													Get a summary of the conversation
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Badge variant="secondary">@ai draft a response</Badge>
												<span className="text-muted-foreground text-sm">
													AI drafts a response for review
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Badge variant="secondary">@ai what do we know?</Badge>
												<span className="text-muted-foreground text-sm">
													AI provides context about the visitor
												</span>
											</div>
										</CardContent>
									</Card>
								</div>
							</SettingsRow>

							<div className="flex justify-end p-4">
								<Button disabled={isSaving} type="submit">
									{isSaving ? "Saving..." : "Save Changes"}
								</Button>
							</div>
						</form>
					</Form>
				)}
			</PageContent>
		</SettingsPage>
	);
}
