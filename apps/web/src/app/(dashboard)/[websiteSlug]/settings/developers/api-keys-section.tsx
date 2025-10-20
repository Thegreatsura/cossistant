"use client";

import type { RouterOutputs } from "@cossistant/api/types";
import { APIKeyType } from "@cossistant/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { copyToClipboardWithMeta } from "@/components/copy-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BaseSubmitButton } from "@/components/ui/base-submit-button";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import Icon from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ApiKeysTable } from "./api-keys-table";

type WebsiteApiKey =
	RouterOutputs["website"]["developerSettings"]["apiKeys"][number];

type ApiKeysSectionProps = {
	websiteSlug: string;
	websiteId: string;
	organizationId: string;
};

const KEY_TYPE_VALUES = [APIKeyType.PUBLIC, APIKeyType.PRIVATE] as const;
const ENVIRONMENT_VALUES = ["production", "test"] as const;

type EnvironmentValue = (typeof ENVIRONMENT_VALUES)[number];

type CreateApiKeyFormValues = {
	name: string;
	keyType: (typeof KEY_TYPE_VALUES)[number];
	environment: EnvironmentValue;
};

const createApiKeyFormSchema = z.object({
	name: z
		.string({ message: "Provide a name for this key." })
		.min(3, { message: "Names must be at least 3 characters." })
		.max(80, { message: "Names must be fewer than 80 characters." }),
	keyType: z.enum(KEY_TYPE_VALUES),
	environment: z.enum(ENVIRONMENT_VALUES),
});

const KEY_TYPE_OPTIONS: Array<{
	value: CreateApiKeyFormValues["keyType"];
	title: string;
	description: string;
}> = [
	{
		value: APIKeyType.PUBLIC,
		title: "Public key",
		description:
			"Use in client-side integrations. Requests are restricted to allowed domains.",
	},
	{
		value: APIKeyType.PRIVATE,
		title: "Private key",
		description:
			"Use for server-to-server communication. The full key is only shown right after creation.",
	},
];

const ENVIRONMENT_OPTIONS: Array<{
	value: EnvironmentValue;
	title: string;
	description: string;
}> = [
	{
		value: "production",
		title: "Production",
		description: "Works on every domain in the allowlist configured below.",
	},
	{
		value: "test",
		title: "Test",
		description: "Only works on localhost. Ideal for local development.",
	},
];

export function ApiKeysSection({
	organizationId,
	websiteId,
	websiteSlug,
}: ApiKeysSectionProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [lastCreatedKey, setLastCreatedKey] = useState<WebsiteApiKey | null>(
		null
	);
	const [revokeTarget, setRevokeTarget] = useState<WebsiteApiKey | null>(null);
	const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

	const form = useForm<CreateApiKeyFormValues>({
		resolver: zodResolver(createApiKeyFormSchema),
		defaultValues: {
			name: "",
			keyType: APIKeyType.PUBLIC,
			environment: "production",
		},
	});

	const { data, isFetching } = useQuery({
		...trpc.website.developerSettings.queryOptions({ slug: websiteSlug }),
	});

	const invalidateDeveloperSettings = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.website.developerSettings.queryKey({ slug: websiteSlug }),
		});

	const { mutateAsync: createApiKey, isPending: isCreating } = useMutation(
		trpc.website.createApiKey.mutationOptions({
			onSuccess: async (createdKey) => {
				await invalidateDeveloperSettings();
				setLastCreatedKey(createdKey);
				toast.success("API key created successfully.");
			},
			onError: () => {
				toast.error("Failed to create API key. Please try again.");
			},
		})
	);

	const { mutateAsync: revokeApiKey, isPending: isRevoking } = useMutation(
		trpc.website.revokeApiKey.mutationOptions({
			onSuccess: async () => {
				await invalidateDeveloperSettings();
				toast.success("API key revoked.");
			},
			onError: () => {
				toast.error("Failed to revoke API key. Please try again.");
			},
		})
	);

	const handleCreateApiKey = async (values: CreateApiKeyFormValues) => {
		await createApiKey({
			organizationId,
			websiteId,
			name: values.name.trim(),
			keyType: values.keyType,
			isTest: values.environment === "test",
		});

		form.reset({
			name: "",
			keyType: values.keyType,
			environment: values.environment,
		});
	};

	const handleConfirmRevoke = async () => {
		if (!revokeTarget) {
			return;
		}

		setRevokingKeyId(revokeTarget.id);

		try {
			await revokeApiKey({
				organizationId,
				websiteId,
				apiKeyId: revokeTarget.id,
			});
			setRevokeTarget(null);
		} finally {
			setRevokingKeyId(null);
		}
	};

	const handleCopyCreatedKey = async (keyValue: string) => {
		try {
			await copyToClipboardWithMeta(keyValue);
			toast.success("API key copied to clipboard");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to copy API key."
			);
		}
	};

	return (
		<div className="space-y-8">
			<div className="space-y-3">
				<p className="text-muted-foreground text-sm">
					Generate keys for your integrations and revoke them when no longer
					needed. Private keys are only visible once—make sure to copy them
					immediately.
				</p>
				<ApiKeysTable
					apiKeys={data?.apiKeys}
					isLoading={isFetching}
					onRequestRevoke={setRevokeTarget}
					revokingKeyId={revokingKeyId}
				/>
			</div>

			<div className="space-y-4 rounded-lg border border-border bg-muted/20 p-6">
				<div>
					<h3 className="font-medium text-muted-foreground text-sm uppercase">
						Create a new key
					</h3>
					<p className="text-muted-foreground text-sm">
						Choose the key type and environment that matches your integration.
					</p>
				</div>

				<Form {...form}>
					<form
						className="space-y-6"
						onSubmit={form.handleSubmit(handleCreateApiKey)}
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Key name</FormLabel>
									<FormControl>
										<Input placeholder="Eg. Production website" {...field} />
									</FormControl>
									<FormDescription>
										The label shown in your dashboard to help identify this key.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="keyType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Key type</FormLabel>
									<FormControl>
										<RadioGroup
											className="grid gap-3 sm:grid-cols-2"
											onValueChange={field.onChange}
											value={field.value}
										>
											{KEY_TYPE_OPTIONS.map((option) => (
												<Label
													className={cn(
														"flex cursor-pointer flex-col gap-1 rounded-lg border bg-background p-4 text-sm",
														field.value === option.value
															? "border-primary"
															: "border-border"
													)}
													htmlFor={`key-type-${option.value}`}
													key={option.value}
												>
													<RadioGroupItem
														className="sr-only"
														id={`key-type-${option.value}`}
														value={option.value}
													/>
													<span className="font-medium">{option.title}</span>
													<span className="text-muted-foreground text-xs">
														{option.description}
													</span>
												</Label>
											))}
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="environment"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Environment</FormLabel>
									<FormControl>
										<RadioGroup
											className="grid gap-3 sm:grid-cols-2"
											onValueChange={field.onChange}
											value={field.value}
										>
											{ENVIRONMENT_OPTIONS.map((option) => (
												<Label
													className={cn(
														"flex cursor-pointer flex-col gap-1 rounded-lg border bg-background p-4 text-sm",
														field.value === option.value
															? "border-primary"
															: "border-border"
													)}
													htmlFor={`environment-${option.value}`}
													key={option.value}
												>
													<RadioGroupItem
														className="sr-only"
														id={`environment-${option.value}`}
														value={option.value}
													/>
													<span className="font-medium">{option.title}</span>
													<span className="text-muted-foreground text-xs">
														{option.description}
													</span>
												</Label>
											))}
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<BaseSubmitButton
							className="w-full sm:w-auto"
							isSubmitting={isCreating}
							type="submit"
						>
							Generate API key
						</BaseSubmitButton>
					</form>
				</Form>
			</div>

			{lastCreatedKey?.key ? (
				<Alert>
					<AlertTitle>Copy your new key now</AlertTitle>
					<AlertDescription className="space-y-3">
						<p>
							This key will not be shown again. Store it securely in your secret
							manager before leaving this page.
						</p>
						<div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 font-mono text-sm">
							<span className="truncate">{lastCreatedKey.key}</span>
							<Button
								onClick={() => {
									if (!lastCreatedKey.key) {
										return;
									}

									void handleCopyCreatedKey(lastCreatedKey.key);
								}}
								size="sm"
								variant="outline"
							>
								<Icon className="size-4" name="clipboard" />
								<span className="sr-only sm:not-sr-only">Copy</span>
							</Button>
						</div>
					</AlertDescription>
				</Alert>
			) : null}

			<Dialog
				onOpenChange={(open) => !open && setRevokeTarget(null)}
				open={Boolean(revokeTarget)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Revoke API key</DialogTitle>
						<DialogDescription>
							Revoking “{revokeTarget?.name}” will immediately disable it. This
							action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="mt-6">
						<Button
							disabled={isRevoking}
							onClick={() => setRevokeTarget(null)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={isRevoking}
							onClick={handleConfirmRevoke}
							type="button"
							variant="destructive"
						>
							{isRevoking ? "Revoking…" : "Revoke key"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
