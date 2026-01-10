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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/lib/trpc/client";

type ResponseBehaviorFormData = {
	responseMode: "always" | "when_no_human" | "on_mention" | "manual";
	responseDelayMs: number;
};

type ResponseBehaviorFormProps = {
	websiteSlug: string;
	aiAgentId: string;
	initialData: GetBehaviorSettingsResponse;
};

export function ResponseBehaviorForm({
	websiteSlug,
	aiAgentId,
	initialData,
}: ResponseBehaviorFormProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const form = useForm<ResponseBehaviorFormData>({
		defaultValues: {
			responseMode: initialData.responseMode,
			responseDelayMs: initialData.responseDelayMs,
		},
	});

	// Reset form when initial data changes
	useEffect(() => {
		form.reset({
			responseMode: initialData.responseMode,
			responseDelayMs: initialData.responseDelayMs,
		});
	}, [initialData, form]);

	const { mutate: updateSettings, isPending } = useMutation(
		trpc.aiAgent.updateBehaviorSettings.mutationOptions({
			onSuccess: () => {
				toast.success("Response behavior settings saved");
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

	const onSubmit = (data: ResponseBehaviorFormData) => {
		updateSettings({
			websiteSlug,
			aiAgentId,
			settings: {
				responseMode: data.responseMode,
				responseDelayMs: data.responseDelayMs,
			},
		});
	};

	return (
		<Form {...form}>
			<form className="flex flex-col" onSubmit={form.handleSubmit(onSubmit)}>
				<div className="space-y-6 px-4 py-6">
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
										<SelectItem value="always">Always respond</SelectItem>
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
