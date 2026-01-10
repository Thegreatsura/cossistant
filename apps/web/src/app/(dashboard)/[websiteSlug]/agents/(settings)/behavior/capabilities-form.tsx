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

type CapabilitiesFormData = {
	canResolve: boolean;
	canMarkSpam: boolean;
	canAssign: boolean;
	canSetPriority: boolean;
	canCategorize: boolean;
	canEscalate: boolean;
	autoAssignOnEscalation: boolean;
};

type CapabilitiesFormProps = {
	websiteSlug: string;
	aiAgentId: string;
	initialData: GetBehaviorSettingsResponse;
};

export function CapabilitiesForm({
	websiteSlug,
	aiAgentId,
	initialData,
}: CapabilitiesFormProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const form = useForm<CapabilitiesFormData>({
		defaultValues: {
			canResolve: initialData.canResolve,
			canMarkSpam: initialData.canMarkSpam,
			canAssign: initialData.canAssign,
			canSetPriority: initialData.canSetPriority,
			canCategorize: initialData.canCategorize,
			canEscalate: initialData.canEscalate,
			autoAssignOnEscalation: initialData.autoAssignOnEscalation,
		},
	});

	// Reset form when initial data changes
	useEffect(() => {
		form.reset({
			canResolve: initialData.canResolve,
			canMarkSpam: initialData.canMarkSpam,
			canAssign: initialData.canAssign,
			canSetPriority: initialData.canSetPriority,
			canCategorize: initialData.canCategorize,
			canEscalate: initialData.canEscalate,
			autoAssignOnEscalation: initialData.autoAssignOnEscalation,
		});
	}, [initialData, form]);

	const { mutate: updateSettings, isPending } = useMutation(
		trpc.aiAgent.updateBehaviorSettings.mutationOptions({
			onSuccess: () => {
				toast.success("Capabilities settings saved");
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

	const onSubmit = (data: CapabilitiesFormData) => {
		updateSettings({
			websiteSlug,
			aiAgentId,
			settings: {
				canResolve: data.canResolve,
				canMarkSpam: data.canMarkSpam,
				canAssign: data.canAssign,
				canSetPriority: data.canSetPriority,
				canCategorize: data.canCategorize,
				canEscalate: data.canEscalate,
				autoAssignOnEscalation: data.autoAssignOnEscalation,
			},
		});
	};

	return (
		<Form {...form}>
			<form className="flex flex-col" onSubmit={form.handleSubmit(onSubmit)}>
				<div className="space-y-4 px-4 py-6">
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
									<FormLabel className="text-base">Mark as Spam</FormLabel>
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
									<FormLabel className="text-base">Set Priority</FormLabel>
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
									<FormLabel className="text-base">Categorize</FormLabel>
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
									<FormLabel className="text-base">Escalate to Human</FormLabel>
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
