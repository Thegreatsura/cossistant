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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTRPC } from "@/lib/trpc/client";

type VisitorContactFormData = {
	visitorContactPolicy: "only_if_needed" | "ask_early" | "ask_after_time";
};

type VisitorContactFormProps = {
	websiteSlug: string;
	aiAgentId: string;
	initialData: GetBehaviorSettingsResponse;
};

export function VisitorContactForm({
	websiteSlug,
	aiAgentId,
	initialData,
}: VisitorContactFormProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const form = useForm<VisitorContactFormData>({
		defaultValues: {
			visitorContactPolicy:
				initialData.visitorContactPolicy ?? "only_if_needed",
		},
	});

	useEffect(() => {
		form.reset({
			visitorContactPolicy:
				initialData.visitorContactPolicy ?? "only_if_needed",
		});
	}, [initialData, form]);

	const { mutate: updateSettings, isPending } = useMutation(
		trpc.aiAgent.updateBehaviorSettings.mutationOptions({
			onSuccess: () => {
				toast.success("Visitor contact settings saved");
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

	const onSubmit = (data: VisitorContactFormData) => {
		updateSettings({
			websiteSlug,
			aiAgentId,
			settings: {
				visitorContactPolicy: data.visitorContactPolicy,
			},
		});
	};

	return (
		<Form {...form}>
			<form className="flex flex-col" onSubmit={form.handleSubmit(onSubmit)}>
				<div className="space-y-4 px-4 py-6">
					<FormField
						control={form.control}
						name="visitorContactPolicy"
						render={({ field }) => (
							<FormItem className="space-y-4">
								<div className="space-y-0.5">
									<FormLabel className="text-base">Pushiness</FormLabel>
									<FormDescription>
										Control when the AI asks for name and email.
									</FormDescription>
								</div>
								<FormControl>
									<RadioGroup
										className="space-y-3"
										onValueChange={field.onChange}
										value={field.value}
									>
										<div className="flex items-start space-x-3">
											<RadioGroupItem
												className="mt-1"
												id="visitor-contact-only-if-needed"
												value="only_if_needed"
											/>
											<div className="space-y-0.5">
												<FormLabel
													className="cursor-pointer font-normal"
													htmlFor="visitor-contact-only-if-needed"
												>
													Only if needed
												</FormLabel>
												<FormDescription>
													Ask only when required to resolve account-specific
													issues.
												</FormDescription>
											</div>
										</div>

										<div className="flex items-start space-x-3">
											<RadioGroupItem
												className="mt-1"
												id="visitor-contact-ask-early"
												value="ask_early"
											/>
											<div className="space-y-0.5">
												<FormLabel
													className="cursor-pointer font-normal"
													htmlFor="visitor-contact-ask-early"
												>
													Ask early
												</FormLabel>
												<FormDescription>
													Prompt in the first AI response when not identified.
												</FormDescription>
											</div>
										</div>

										<div className="flex items-start space-x-3">
											<RadioGroupItem
												className="mt-1"
												id="visitor-contact-ask-after-time"
												value="ask_after_time"
											/>
											<div className="space-y-0.5">
												<FormLabel
													className="cursor-pointer font-normal"
													htmlFor="visitor-contact-ask-after-time"
												>
													Ask after some time
												</FormLabel>
												<FormDescription>
													Wait until after two visitor messages.
												</FormDescription>
											</div>
										</div>
									</RadioGroup>
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
