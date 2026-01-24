"use client";

import type { GetBehaviorSettingsResponse } from "@cossistant/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BaseSubmitButton } from "@/components/ui/base-submit-button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from "@/components/ui/form";
import { SettingsRowFooter } from "@/components/ui/layout/settings-layout";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/lib/trpc/client";

type BackgroundAnalysisFormData = {
	autoAnalyzeSentiment: boolean;
	autoGenerateTitle: boolean;
	autoCategorize: boolean;
};

type BackgroundAnalysisFormProps = {
	websiteSlug: string;
	aiAgentId: string;
	initialData: GetBehaviorSettingsResponse;
};

export function BackgroundAnalysisForm({
	websiteSlug,
	aiAgentId,
	initialData,
}: BackgroundAnalysisFormProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const form = useForm<BackgroundAnalysisFormData>({
		defaultValues: {
			autoAnalyzeSentiment: initialData.autoAnalyzeSentiment,
			autoGenerateTitle: initialData.autoGenerateTitle,
			autoCategorize: initialData.autoCategorize,
		},
	});

	// Reset form when initial data changes
	useEffect(() => {
		form.reset({
			autoAnalyzeSentiment: initialData.autoAnalyzeSentiment,
			autoGenerateTitle: initialData.autoGenerateTitle,
			autoCategorize: initialData.autoCategorize,
		});
	}, [initialData, form]);

	const { mutate: updateSettings, isPending } = useMutation(
		trpc.aiAgent.updateBehaviorSettings.mutationOptions({
			onSuccess: () => {
				toast.success("Background analysis settings saved");
				void queryClient.invalidateQueries({
					queryKey: trpc.aiAgent.getBehaviorSettings.queryKey({
						websiteSlug,
					}),
				});
				form.reset(form.getValues());
			},
			onError: (error) => {
				toast.error(error.message || "Failed to save settings");
			},
		})
	);

	const onSubmit = (data: BackgroundAnalysisFormData) => {
		updateSettings({
			websiteSlug,
			aiAgentId,
			settings: {
				autoAnalyzeSentiment: data.autoAnalyzeSentiment,
				autoGenerateTitle: data.autoGenerateTitle,
				autoCategorize: data.autoCategorize,
			},
		});
	};

	return (
		<Form {...form}>
			<form className="flex flex-col" onSubmit={form.handleSubmit(onSubmit)}>
				<div className="space-y-4 px-4 py-6">
					<FormField
						control={form.control}
						name="autoAnalyzeSentiment"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center justify-between py-2">
								<div className="space-y-0.5">
									<FormLabel className="text-base">Analyze Sentiment</FormLabel>
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
							<FormItem className="flex flex-row items-center justify-between py-2">
								<div className="space-y-0.5">
									<FormLabel className="text-base">Generate Titles</FormLabel>
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
							<FormItem className="flex flex-row items-center justify-between py-2">
								<div className="space-y-0.5">
									<FormLabel className="text-base">Auto-categorize</FormLabel>
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
				<SettingsRowFooter className="flex items-center justify-end">
					<BaseSubmitButton
						disabled={!form.formState.isDirty}
						isSubmitting={isPending}
						size="sm"
					>
						Save settings
					</BaseSubmitButton>
				</SettingsRowFooter>
			</form>
		</Form>
	);
}
