"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { BaseSubmitButton } from "@/components/ui/base-submit-button";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Icon from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type AllowedDomainsFormProps = {
  initialDomains: string[];
  organizationId: string;
  websiteId: string;
  websiteSlug: string;
};

const allowedProtocols = new Set(["http:", "https:"]);

export const normalizeDomainOrigin = (value: string) => {
  const parsed = new URL(value);

  if (!allowedProtocols.has(parsed.protocol)) {
    throw new Error("Only http:// or https:// URLs are allowed.");
  }

  return parsed.origin;
};

const allowedDomainsSchema = z.object({
  domains: z
    .array(
      z
        .string({ message: "Enter a domain." })
        .trim()
        .min(1, { message: "Domains cannot be empty." })
        .superRefine((value, ctx) => {
          try {
            normalizeDomainOrigin(value);
          } catch (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                error instanceof Error
                  ? error.message
                  : "Enter a valid URL including http:// or https://.",
            });
          }
        })
    )
    .min(1, { message: "Add at least one domain." }),
});

type AllowedDomainsFormValues = z.infer<typeof allowedDomainsSchema>;

type DomainsInputProps = {
  form: UseFormReturn<AllowedDomainsFormValues>;
  isSubmitting: boolean;
};

function DomainsInput({ form, isSubmitting }: DomainsInputProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    // @ts-expect-error - TypeScript inference issue with useFieldArray
    name: "domains",
  });

  return (
    <>
      <div className="space-y-4">
        {fields.map((fieldItem, index) => (
          <FormField
            control={form.control}
            key={fieldItem.id}
            name={`domains.${index}` as const}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  <span>Domain {index + 1}</span>
                  {fields.length > 1 ? (
                    <Button
                      disabled={isSubmitting}
                      onClick={() => remove(index)}
                      size="icon"
                      type="button"
                      variant="ghost"
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
                    className={cn({ "pr-12": fields.length > 1 })}
                    onBlur={(event) => {
                      field.onChange(event.target.value.trim());
                    }}
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
          disabled={isSubmitting}
          onClick={() => append("")}
          type="button"
          variant="outline"
        >
          Add domain
        </Button>
      </div>
    </>
  );
}

export function AllowedDomainsForm({
  initialDomains,
  organizationId,
  websiteId,
  websiteSlug,
}: AllowedDomainsFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const normalizedInitialDomains = useMemo(
    () =>
      initialDomains.map((domain) => {
        try {
          return normalizeDomainOrigin(domain);
        } catch {
          return domain;
        }
      }),
    [initialDomains]
  );
  const form = useForm<AllowedDomainsFormValues>({
    resolver: zodResolver(allowedDomainsSchema),
    mode: "onChange",
    defaultValues: {
      domains: normalizedInitialDomains.length
        ? normalizedInitialDomains
        : [""],
    },
  });
  const { reset } = form;

  useEffect(() => {
    reset({
      domains: normalizedInitialDomains.length
        ? normalizedInitialDomains
        : [""],
    });
  }, [reset, normalizedInitialDomains]);

  const invalidateDeveloperSettings = async () =>
    await queryClient.invalidateQueries({
      queryKey: trpc.website.developerSettings.queryKey({ slug: websiteSlug }),
    });

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
    const sanitized = values.domains
      .map((domain) => domain.trim())
      .filter(Boolean);

    let normalizedOrigins: string[];

    try {
      normalizedOrigins = sanitized.map((domain) =>
        normalizeDomainOrigin(domain)
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "One or more domains are invalid."
      );
      return;
    }

    const uniqueDomains = Array.from(new Set(normalizedOrigins));

    await updateWebsite({
      organizationId,
      websiteId,
      data: { whitelistedDomains: uniqueDomains },
    });

    reset({ domains: uniqueDomains });
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
          <DomainsInput form={form} isSubmitting={isSubmitting} />

          <BaseSubmitButton
            disabled={!form.formState.isDirty}
            isSubmitting={isSubmitting}
            type="submit"
          >
            Save allowed domains
          </BaseSubmitButton>
        </form>
      </Form>
    </div>
  );
}
