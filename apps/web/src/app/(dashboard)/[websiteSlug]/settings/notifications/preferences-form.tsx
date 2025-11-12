"use client";

import {
	MEMBER_NOTIFICATION_DEFINITION_MAP,
	MemberNotificationChannel,
	type MemberNotificationSettingsResponse,
} from "@cossistant/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BaseSubmitButton } from "@/components/ui/base-submit-button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SettingsRowFooter } from "@/components/ui/layout/settings-layout";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/lib/trpc/client";

const notificationFormSchema = z.object({
	[MemberNotificationChannel.EMAIL_MARKETING]: z.object({
		enabled: z.boolean(),
	}),
	[MemberNotificationChannel.EMAIL_NEW_MESSAGE]: z.object({
		enabled: z.boolean(),
		delayMinutes: z.number().int().min(0).max(1440),
	}),
	[MemberNotificationChannel.BROWSER_PUSH_NEW_MESSAGE]: z.object({
		enabled: z.boolean(),
	}),
});

type NotificationFormValues = z.infer<typeof notificationFormSchema>;

type MemberNotificationSettingsFormProps = {
	websiteSlug: string;
};

function toFormValues(
	data: MemberNotificationSettingsResponse | undefined
): NotificationFormValues {
	const marketing = data?.settings.find(
		(setting) => setting.channel === MemberNotificationChannel.EMAIL_MARKETING
	);
	const emailMessages = data?.settings.find(
		(setting) => setting.channel === MemberNotificationChannel.EMAIL_NEW_MESSAGE
	);
	const browserPush = data?.settings.find(
		(setting) =>
			setting.channel === MemberNotificationChannel.BROWSER_PUSH_NEW_MESSAGE
	);
	const emailDefinition = MEMBER_NOTIFICATION_DEFINITION_MAP.get(
		MemberNotificationChannel.EMAIL_NEW_MESSAGE
	);

	const defaultEmailDelayMinutes = emailDefinition
		? Math.round(emailDefinition.defaultDelaySeconds / 60)
		: 5;

	return {
		[MemberNotificationChannel.EMAIL_MARKETING]: {
			enabled: marketing?.enabled ?? true,
		},
		[MemberNotificationChannel.EMAIL_NEW_MESSAGE]: {
			enabled: emailMessages?.enabled ?? true,
			delayMinutes: emailMessages
				? Math.round(emailMessages.delaySeconds / 60)
				: defaultEmailDelayMinutes,
		},
		[MemberNotificationChannel.BROWSER_PUSH_NEW_MESSAGE]: {
			enabled: browserPush?.enabled ?? false,
		},
	} satisfies NotificationFormValues;
}

export function MemberNotificationSettingsForm({
	websiteSlug,
}: MemberNotificationSettingsFormProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data, isFetching } = useQuery({
		...trpc.notification.getMemberSettings.queryOptions({
			websiteSlug,
		}),
	});

	const form = useForm<NotificationFormValues>({
		resolver: zodResolver(notificationFormSchema),
		defaultValues: toFormValues(data),
	});

	useEffect(() => {
		if (!data) {
			return;
		}

		form.reset(toFormValues(data));
	}, [data, form]);

	const { mutateAsync: updateSettings, isPending } = useMutation(
		trpc.notification.updateMemberSettings.mutationOptions({
			onSuccess: async (response) => {
				await queryClient.invalidateQueries({
					queryKey: trpc.notification.getMemberSettings.queryKey({
						websiteSlug,
					}),
				});
				form.reset(toFormValues(response));
				toast.success("Notification preferences saved.");
			},
			onError: () => {
				toast.error(
					"We couldn't update your notification preferences. Try again."
				);
			},
		})
	);

	const onSubmit = useCallback(
		async (values: NotificationFormValues) => {
			if (!data) {
				return;
			}

			const nextSettings = data.settings.map((setting) => {
				const definition = MEMBER_NOTIFICATION_DEFINITION_MAP.get(
					setting.channel
				);

				if (!definition) {
					return setting;
				}

				if (setting.channel === MemberNotificationChannel.EMAIL_MARKETING) {
					return {
						...setting,
						enabled: values[MemberNotificationChannel.EMAIL_MARKETING].enabled,
					};
				}

				if (setting.channel === MemberNotificationChannel.EMAIL_NEW_MESSAGE) {
					const delayMinutes =
						values[MemberNotificationChannel.EMAIL_NEW_MESSAGE].delayMinutes;

					return {
						...setting,
						enabled:
							values[MemberNotificationChannel.EMAIL_NEW_MESSAGE].enabled,
						delaySeconds: Math.max(0, delayMinutes * 60),
					};
				}

				if (
					setting.channel === MemberNotificationChannel.BROWSER_PUSH_NEW_MESSAGE
				) {
					return {
						...setting,
						enabled:
							values[MemberNotificationChannel.BROWSER_PUSH_NEW_MESSAGE]
								.enabled,
						delaySeconds: definition.defaultDelaySeconds,
					};
				}

				return setting;
			});

			await updateSettings({
				websiteSlug,
				settings: nextSettings.map((setting) => ({
					channel: setting.channel,
					enabled: setting.enabled,
					delaySeconds: setting.delaySeconds,
					priority: setting.priority,
					config: setting.config,
				})),
			});
		},
		[data, updateSettings, websiteSlug]
	);

	const renderDescription = useCallback(
		(channel: MemberNotificationChannel) => {
			const definition = MEMBER_NOTIFICATION_DEFINITION_MAP.get(channel);
			const current = data?.settings.find(
				(setting) => setting.channel === channel
			);

			if (!definition) {
				return null;
			}

			return (
				<div className="space-y-1 text-muted-foreground text-sm">
					<p>{definition.description}</p>
					{definition.requiresSetup && !current?.config && (
						<p className="text-amber-600 text-xs dark:text-amber-400">
							Set up browser push credentials before enabling alerts.
						</p>
					)}
				</div>
			);
		},
		[data?.settings]
	);

	const isDisabled = isFetching || isPending || !data;

	return (
		<Form {...form}>
			<form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
				<div className="space-y-6 p-4">
					<FormField
						control={form.control}
						name={
							`${MemberNotificationChannel.EMAIL_MARKETING}.enabled` as const
						}
						render={({ field }) => (
							<FormItem className="space-y-3">
								<div className="flex items-center justify-between gap-6">
									<div>
										<FormLabel className="text-base">
											Marketing emails
										</FormLabel>
										<FormDescription>
											{renderDescription(
												MemberNotificationChannel.EMAIL_MARKETING
											)}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											disabled={isDisabled}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name={
							`${MemberNotificationChannel.EMAIL_NEW_MESSAGE}.enabled` as const
						}
						render={({ field }) => (
							<FormItem className="space-y-3">
								<div className="flex items-center justify-between gap-6">
									<div className="space-y-3">
										<div>
											<FormLabel className="text-base">
												New message emails
											</FormLabel>
											<FormDescription>
												{renderDescription(
													MemberNotificationChannel.EMAIL_NEW_MESSAGE
												)}
											</FormDescription>
										</div>
										<FormField
											control={form.control}
											name={
												`${MemberNotificationChannel.EMAIL_NEW_MESSAGE}.delayMinutes` as const
											}
											render={({ field: delayField }) => (
												<FormItem>
													<FormLabel>Delay before emailing</FormLabel>
													<FormControl>
														<Input
															{...delayField}
															disabled={isDisabled || !field.value}
															inputMode="numeric"
															max={1440}
															min={0}
															type="number"
														/>
													</FormControl>
													<FormDescription>
														Minutes to wait after a new message before sending
														an email.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											disabled={isDisabled}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name={
							`${MemberNotificationChannel.BROWSER_PUSH_NEW_MESSAGE}.enabled` as const
						}
						render={({ field }) => (
							<FormItem className="space-y-3">
								<div className="flex items-center justify-between gap-6">
									<div>
										<FormLabel className="text-base">
											Browser push notifications
										</FormLabel>
										<FormDescription>
											{renderDescription(
												MemberNotificationChannel.BROWSER_PUSH_NEW_MESSAGE
											)}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											disabled={isDisabled}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<SettingsRowFooter>
					<BaseSubmitButton
						disabled={isDisabled || !form.formState.isDirty}
						isSubmitting={isPending}
					>
						Save preferences
					</BaseSubmitButton>
				</SettingsRowFooter>
			</form>
		</Form>
	);
}
