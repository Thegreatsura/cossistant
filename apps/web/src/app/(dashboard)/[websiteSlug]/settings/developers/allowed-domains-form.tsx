"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { BaseSubmitButton } from "@/components/ui/base-submit-button";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Icon from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/lib/trpc/client";
import { z } from "zod";

type AllowedDomainsFormProps = {
        initialDomains: string[];
        organizationId: string;
        websiteId: string;
        websiteSlug: string;
};

const allowedDomainsSchema = z.object({
        domains: z
                .array(
                        z
                                .string({ required_error: "Enter a domain." })
                                .min(1, { message: "Domains cannot be empty." })
                                .url({ message: "Enter a valid URL including http:// or https://." })
                )
                .min(1, { message: "Add at least one domain." }),
});

type AllowedDomainsFormValues = z.infer<typeof allowedDomainsSchema>;

export function AllowedDomainsForm({
        initialDomains,
        organizationId,
        websiteId,
        websiteSlug,
}: AllowedDomainsFormProps) {
        const trpc = useTRPC();
        const queryClient = useQueryClient();
        const form = useForm<AllowedDomainsFormValues>({
                resolver: zodResolver(allowedDomainsSchema),
                defaultValues: {
                        domains: initialDomains.length ? initialDomains : [""],
                },
        });

        const { fields, append, remove } = useFieldArray({
                control: form.control,
                name: "domains",
        });

        useEffect(() => {
                form.reset({ domains: initialDomains.length ? initialDomains : [""] });
        }, [form, initialDomains]);

        const invalidateDeveloperSettings = () =>
                queryClient.invalidateQueries(
                        trpc.website.developerSettings.queryKey({ slug: websiteSlug })
                );

        const { mutateAsync: updateWebsite, isPending: isSubmitting } = useMutation(
                trpc.website.update.mutationOptions({
                        onSuccess: async () => {
                                await invalidateDeveloperSettings();
                                toast.success("Allowed domains updated.");
                        },
                        onError: () => {
                                toast.error("Failed to update allowed domains. Please try again.");
                        },
                })
        );

        const handleSubmit = async (values: AllowedDomainsFormValues) => {
                const sanitized = values.domains.map((domain) => domain.trim()).filter(Boolean);
                const uniqueDomains = Array.from(new Set(sanitized));

                await updateWebsite({
                        organizationId,
                        websiteId,
                        data: { whitelistedDomains: uniqueDomains },
                });

                form.reset({ domains: uniqueDomains });
        };

        return (
                <div className="space-y-4">
                        <p className="text-muted-foreground text-sm">
                                Domains outside of this list will be blocked when using public API keys. Include the protocol so we
                                know whether to use HTTP or HTTPS.
                        </p>

                        <Form {...form}>
                                <form
                                        className="space-y-6"
                                        onSubmit={form.handleSubmit(handleSubmit)}
                                >
                                        <div className="space-y-4">
                                                {fields.map((field, index) => (
                                                        <FormField
                                                                key={field.id}
                                                                control={form.control}
                                                                name={`domains.${index}`}
                                                                render={({ field }) => (
                                                                        <FormItem>
                                                                                <FormLabel className="flex items-center justify-between">
                                                                                        <span>Domain {index + 1}</span>
                                                                                        {fields.length > 1 ? (
                                                                                                <Button
                                                                                                        type="button"
                                                                                                        variant="ghost"
                                                                                                        size="icon"
                                                                                                        onClick={() => remove(index)}
                                                                                                        disabled={isSubmitting}
                                                                                                >
                                                                                                        <Icon className="size-4" name="x" />
                                                                                                        <span className="sr-only">Remove</span>
                                                                                                </Button>
                                                                                        ) : null}
                                                                                </FormLabel>
                                                                                <FormControl>
                                                                                        <Input
                                                                                                placeholder="https://example.com"
                                                                                                {...field}
                                                                                                onBlur={(event) => {
                                                                                                        field.onChange(event.target.value.trim());
                                                                                                }}
                                                                                                className={cn({ "pr-12": fields.length > 1 })}
                                                                                        />
                                                                                </FormControl>
                                                                                <FormMessage />
                                                                        </FormItem>
                                                                )}
                                                        />
                                                ))}
                                        </div>

                                        <div>
                                                <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => append("")}
                                                        disabled={isSubmitting}
                                                >
                                                        Add domain
                                                </Button>
                                        </div>

                                        <BaseSubmitButton
                                                isSubmitting={isSubmitting}
                                                disabled={!form.formState.isDirty}
                                                type="submit"
                                        >
                                                Save allowed domains
                                        </BaseSubmitButton>
                                </form>
                        </Form>
                </div>
        );
}
