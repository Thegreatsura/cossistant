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
import { Input } from "@/components/ui/input";
import { SettingsRowFooter } from "@/components/ui/layout/settings-layout";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/lib/trpc/client";

type HumanInteractionFormData = {
	pauseOnHumanReply: boolean;
	pauseDurationMinutes: number | null;
};

type HumanInteractionFormProps = {
	websiteSlug: string;
	aiAgentId: string;
	initialData: GetBehaviorSettingsResponse;
};

export function HumanInteractionForm({
	websiteSlug,
	aiAgentId,
	initialData,
}: HumanInteractionFormProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const form = useForm<HumanInteractionFormData>({
		defaultValues: {
			pauseOnHumanReply: initialData.pauseOnHumanReply,
			pauseDurationMinutes: initialData.pauseDurationMinutes,
		},
	});

	// Reset form when initial data changes
	useEffect(() => {
		form.reset({
			pauseOnHumanReply: initialData.pauseOnHumanReply,
			pauseDurationMinutes: initialData.pauseDurationMinutes,
		});
	}, [initialData, form]);

	const { mutate: updateSettings, isPending } = useMutation(
		trpc.aiAgent.updateBehaviorSettings.mutationOptions({
			onSuccess: () => {
				toast.success("Human interaction settings saved");
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

	const onSubmit = (data: HumanInteractionFormData) => {
		updateSettings({
			websiteSlug,
			aiAgentId,
			settings: {
				pauseOnHumanReply: data.pauseOnHumanReply,
				pauseDurationMinutes: data.pauseDurationMinutes,
			},
		});
	};

	return (
		<Form {...form}>
			<form className="flex flex-col" onSubmit={form.handleSubmit(onSubmit)}>
				<div className="space-y-6 px-4 py-6">
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
