"use client";

import type { GetCapabilitiesStudioResponse } from "@cossistant/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SkillMarkdownEditor } from "@/components/agents/skills/skill-markdown-editor";
import {
	normalizeSkillFrontmatterName,
	parseSkillEditorContent,
	serializeSkillEditorContent,
	toCanonicalSkillFileNameFromFrontmatterName,
} from "@/components/agents/skills/tools-studio-utils";
import { Badge } from "@/components/ui/badge";
import { BaseSubmitButton } from "@/components/ui/base-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContent } from "@/components/ui/layout";
import {
	SettingsHeader,
	SettingsPage,
	SettingsRow,
	SettingsRowFooter,
} from "@/components/ui/layout/settings-layout";
import { PromptEditModal } from "@/components/ui/prompt-edit-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useWebsite } from "@/contexts/website";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type SkillEditorTarget =
	| { kind: "template"; templateName: string }
	| { kind: "custom"; skillId: string }
	| { kind: "system"; skillName: string }
	| { kind: "create-custom" }
	| null;

export default function SkillsPage() {
	const website = useWebsite();
	const router = useRouter();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [newSkillName, setNewSkillName] = useState("");
	const [newSkillDescription, setNewSkillDescription] = useState("");
	const [newSkillBody, setNewSkillBody] = useState(
		"## New Skill\n\nDescribe when and how this skill should be used."
	);

	const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>(
		{}
	);
	const [customSkillDrafts, setCustomSkillDrafts] = useState<
		Record<string, string>
	>({});
	const [systemDrafts, setSystemDrafts] = useState<Record<string, string>>({});
	const [editorTarget, setEditorTarget] = useState<SkillEditorTarget>(null);

	const { data: aiAgent, isLoading: isLoadingAgent } = useQuery(
		trpc.aiAgent.get.queryOptions({
			websiteSlug: website.slug,
		})
	);

	const {
		data: studio,
		isLoading: isLoadingStudio,
		isError: isStudioError,
	} = useQuery({
		...trpc.aiAgent.getCapabilitiesStudio.queryOptions({
			websiteSlug: website.slug,
			aiAgentId: aiAgent?.id ?? "",
		}),
		enabled: Boolean(aiAgent?.id),
	});

	useEffect(() => {
		if (!(isLoadingAgent || aiAgent)) {
			router.replace(`/${website.slug}/agent/create`);
		}
	}, [aiAgent, isLoadingAgent, router, website.slug]);

	useEffect(() => {
		if (!studio) {
			return;
		}

		setTemplateDrafts(
			Object.fromEntries(
				studio.defaultSkillTemplates.map((template) => [
					template.name,
					template.content,
				])
			)
		);
		setCustomSkillDrafts(
			Object.fromEntries(
				studio.skillDocuments.map((skill) => [skill.id, skill.content])
			)
		);
		setSystemDrafts(
			Object.fromEntries(
				studio.systemSkillDocuments.map((skill) => [skill.name, skill.content])
			)
		);
	}, [studio]);

	const invalidateStudio = async () => {
		if (!aiAgent) {
			return;
		}

		await queryClient.invalidateQueries({
			queryKey: trpc.aiAgent.getCapabilitiesStudio.queryKey({
				websiteSlug: website.slug,
				aiAgentId: aiAgent.id,
			}),
		});
	};

	const createSkillMutation = useMutation(
		trpc.aiAgent.createSkillDocument.mutationOptions({
			onSuccess: () => {
				void invalidateStudio();
			},
		})
	);

	const updateSkillMutation = useMutation(
		trpc.aiAgent.updateSkillDocument.mutationOptions({
			onSuccess: () => {
				void invalidateStudio();
			},
		})
	);

	const toggleSkillMutation = useMutation(
		trpc.aiAgent.toggleSkillDocument.mutationOptions({
			onSuccess: () => {
				void invalidateStudio();
			},
		})
	);

	const deleteSkillMutation = useMutation(
		trpc.aiAgent.deleteSkillDocument.mutationOptions({
			onSuccess: () => {
				void invalidateStudio();
			},
		})
	);

	const upsertCoreMutation = useMutation(
		trpc.aiAgent.upsertCoreDocument.mutationOptions({
			onSuccess: () => {
				void invalidateStudio();
			},
		})
	);

	const isMutating =
		createSkillMutation.isPending ||
		updateSkillMutation.isPending ||
		toggleSkillMutation.isPending ||
		deleteSkillMutation.isPending ||
		upsertCoreMutation.isPending;

	const toolMentionOptions = useMemo(
		() =>
			(studio?.tools ?? []).map((tool) => ({
				id: tool.id,
				name: tool.label,
				description: tool.description,
			})),
		[studio?.tools]
	);

	const templateNameSet = useMemo(
		() =>
			new Set((studio?.defaultSkillTemplates ?? []).map((item) => item.name)),
		[studio?.defaultSkillTemplates]
	);

	const customSkills = useMemo(
		() =>
			(studio?.skillDocuments ?? []).filter(
				(skill) => !templateNameSet.has(skill.name)
			),
		[studio?.skillDocuments, templateNameSet]
	);

	const activeTemplate = useMemo(() => {
		if (!(studio && editorTarget?.kind === "template")) {
			return null;
		}
		return (
			studio.defaultSkillTemplates.find(
				(template) => template.name === editorTarget.templateName
			) ?? null
		);
	}, [editorTarget, studio]);

	const activeCustomSkill = useMemo(() => {
		if (!(studio && editorTarget?.kind === "custom")) {
			return null;
		}
		return (
			studio.skillDocuments.find(
				(skill) => skill.id === editorTarget.skillId
			) ?? null
		);
	}, [editorTarget, studio]);

	const activeSystemSkill = useMemo(() => {
		if (!(studio && editorTarget?.kind === "system")) {
			return null;
		}
		return (
			studio.systemSkillDocuments.find(
				(skill) => skill.name === editorTarget.skillName
			) ?? null
		);
	}, [editorTarget, studio]);

	const editorTitle = useMemo(() => {
		if (editorTarget?.kind === "template") {
			return activeTemplate?.label ?? "Edit Template";
		}
		if (editorTarget?.kind === "custom") {
			return activeCustomSkill?.name ?? "Edit Skill";
		}
		if (editorTarget?.kind === "system") {
			return activeSystemSkill?.label ?? "Edit System Skill";
		}
		if (editorTarget?.kind === "create-custom") {
			return "Create Custom Skill";
		}
		return "Skill Editor";
	}, [activeCustomSkill, activeSystemSkill, activeTemplate, editorTarget]);

	const buildCanonicalSkillContent = (input: {
		content: string;
		canonicalFileName: string;
		fallbackDescription?: string;
	}) => {
		const parsed = parseSkillEditorContent({
			content: input.content,
			canonicalFileName: input.canonicalFileName,
			fallbackDescription: input.fallbackDescription,
		});

		return serializeSkillEditorContent({
			name: normalizeSkillFrontmatterName(input.canonicalFileName),
			description: parsed.description,
			body: parsed.body,
		});
	};

	if (!aiAgent || isLoadingAgent) {
		return null;
	}

	const handleEnableTemplate = async (
		template: GetCapabilitiesStudioResponse["defaultSkillTemplates"][number],
		enabled: boolean
	) => {
		const content = buildCanonicalSkillContent({
			content: templateDrafts[template.name] ?? template.content,
			canonicalFileName: template.name,
			fallbackDescription: template.description,
		});

		if (template.skillDocumentId) {
			await updateSkillMutation.mutateAsync({
				websiteSlug: website.slug,
				aiAgentId: aiAgent.id,
				skillDocumentId: template.skillDocumentId,
				enabled,
				content,
			});
			return;
		}

		await createSkillMutation.mutateAsync({
			websiteSlug: website.slug,
			aiAgentId: aiAgent.id,
			name: template.name,
			content,
			enabled,
			priority: 0,
		});
	};

	const handleSaveTemplateOverride = async (
		template: GetCapabilitiesStudioResponse["defaultSkillTemplates"][number]
	) => {
		const content = buildCanonicalSkillContent({
			content: templateDrafts[template.name] ?? template.content,
			canonicalFileName: template.name,
			fallbackDescription: template.description,
		});
		if (template.skillDocumentId) {
			await updateSkillMutation.mutateAsync({
				websiteSlug: website.slug,
				aiAgentId: aiAgent.id,
				skillDocumentId: template.skillDocumentId,
				content,
			});
			return;
		}

		await createSkillMutation.mutateAsync({
			websiteSlug: website.slug,
			aiAgentId: aiAgent.id,
			name: template.name,
			content,
			enabled: false,
			priority: 0,
		});
	};

	const handleResetTemplate = async (
		template: GetCapabilitiesStudioResponse["defaultSkillTemplates"][number]
	) => {
		if (!template.skillDocumentId) {
			return;
		}

		await deleteSkillMutation.mutateAsync({
			websiteSlug: website.slug,
			aiAgentId: aiAgent.id,
			skillDocumentId: template.skillDocumentId,
		});
	};

	const handleCreateCustomSkill = async () => {
		const normalizedName =
			toCanonicalSkillFileNameFromFrontmatterName(newSkillName);
		if (!(normalizedName && newSkillBody.trim())) {
			return;
		}
		const content = serializeSkillEditorContent({
			name: normalizeSkillFrontmatterName(normalizedName),
			description: newSkillDescription,
			body: newSkillBody,
		});

		await createSkillMutation.mutateAsync({
			websiteSlug: website.slug,
			aiAgentId: aiAgent.id,
			name: normalizedName,
			content,
			enabled: true,
			priority: 0,
		});

		setNewSkillName("");
		setNewSkillDescription("");
		setNewSkillBody(
			"## New Skill\n\nDescribe when and how this skill should be used."
		);
		setEditorTarget(null);
	};

	if (isLoadingStudio) {
		return (
			<SettingsPage>
				<SettingsHeader>Skills</SettingsHeader>
				<PageContent className="py-30">
					<div className="space-y-8">
						{Array.from({ length: 3 }).map((_, index) => (
							<SettingsRow
								description="Loading skills studio..."
								key={index}
								title={`Section ${index + 1}`}
							>
								<div className="space-y-3 p-4">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
								</div>
							</SettingsRow>
						))}
					</div>
				</PageContent>
			</SettingsPage>
		);
	}

	if (isStudioError || !studio) {
		return (
			<SettingsPage>
				<SettingsHeader>Skills</SettingsHeader>
				<PageContent className="py-30">
					<div className="p-6 text-center text-destructive">
						Failed to load skills.
					</div>
				</PageContent>
			</SettingsPage>
		);
	}

	const modalBody = (() => {
		if (editorTarget?.kind === "template") {
			if (!activeTemplate) {
				return (
					<p className="p-3 text-muted-foreground text-sm">
						Template not found.
					</p>
				);
			}
			const templateContent =
				templateDrafts[activeTemplate.name] ?? activeTemplate.content;
			const parsedTemplateContent = parseSkillEditorContent({
				content: templateContent,
				canonicalFileName: activeTemplate.name,
				fallbackDescription: activeTemplate.description,
			});
			const templateFrontmatterName = normalizeSkillFrontmatterName(
				activeTemplate.name
			);

			return (
				<div className="space-y-3 p-2">
					<Input
						aria-label="Template name"
						disabled={true}
						value={templateFrontmatterName}
					/>
					<Input
						aria-label="Template description"
						disabled={isMutating}
						onChange={(event) =>
							setTemplateDrafts((current) => ({
								...current,
								[activeTemplate.name]: serializeSkillEditorContent({
									name: templateFrontmatterName,
									description: event.target.value,
									body: parsedTemplateContent.body,
								}),
							}))
						}
						placeholder="Description"
						value={parsedTemplateContent.description}
					/>
					<SkillMarkdownEditor
						disabled={isMutating}
						onChange={(nextValue) =>
							setTemplateDrafts((current) => ({
								...current,
								[activeTemplate.name]: serializeSkillEditorContent({
									name: templateFrontmatterName,
									description: parsedTemplateContent.description,
									body: nextValue,
								}),
							}))
						}
						rows={20}
						toolMentions={toolMentionOptions}
						value={parsedTemplateContent.body}
					/>
				</div>
			);
		}

		if (editorTarget?.kind === "custom") {
			if (!activeCustomSkill) {
				return (
					<p className="p-3 text-muted-foreground text-sm">Skill not found.</p>
				);
			}
			const customSkillContent =
				customSkillDrafts[activeCustomSkill.id] ?? activeCustomSkill.content;
			const parsedCustomContent = parseSkillEditorContent({
				content: customSkillContent,
				canonicalFileName: activeCustomSkill.name,
			});

			return (
				<div className="space-y-3 p-2">
					<Input
						aria-label="Custom skill name"
						disabled={isMutating}
						onChange={(event) =>
							setCustomSkillDrafts((current) => ({
								...current,
								[activeCustomSkill.id]: serializeSkillEditorContent({
									name: event.target.value,
									description: parsedCustomContent.description,
									body: parsedCustomContent.body,
								}),
							}))
						}
						placeholder="refund-playbook"
						value={parsedCustomContent.name}
					/>
					<Input
						aria-label="Custom skill description"
						disabled={isMutating}
						onChange={(event) =>
							setCustomSkillDrafts((current) => ({
								...current,
								[activeCustomSkill.id]: serializeSkillEditorContent({
									name: parsedCustomContent.name,
									description: event.target.value,
									body: parsedCustomContent.body,
								}),
							}))
						}
						placeholder="Description"
						value={parsedCustomContent.description}
					/>
					<SkillMarkdownEditor
						disabled={isMutating}
						onChange={(nextValue) =>
							setCustomSkillDrafts((current) => ({
								...current,
								[activeCustomSkill.id]: serializeSkillEditorContent({
									name: parsedCustomContent.name,
									description: parsedCustomContent.description,
									body: nextValue,
								}),
							}))
						}
						rows={20}
						toolMentions={toolMentionOptions}
						value={parsedCustomContent.body}
					/>
				</div>
			);
		}

		if (editorTarget?.kind === "system") {
			if (!activeSystemSkill) {
				return (
					<p className="p-3 text-muted-foreground text-sm">
						System skill not found.
					</p>
				);
			}

			return (
				<SkillMarkdownEditor
					disabled={isMutating}
					onChange={(nextValue) =>
						setSystemDrafts((current) => ({
							...current,
							[activeSystemSkill.name]: nextValue,
						}))
					}
					rows={20}
					toolMentions={toolMentionOptions}
					value={
						systemDrafts[activeSystemSkill.name] ?? activeSystemSkill.content
					}
				/>
			);
		}

		if (editorTarget?.kind === "create-custom") {
			return (
				<div className="space-y-3 p-2">
					<Input
						aria-label="New custom skill name"
						disabled={isMutating}
						onChange={(event) => setNewSkillName(event.target.value)}
						placeholder="refund-playbook"
						value={newSkillName}
					/>
					<Input
						aria-label="New custom skill description"
						disabled={isMutating}
						onChange={(event) => setNewSkillDescription(event.target.value)}
						placeholder="Description"
						value={newSkillDescription}
					/>
					<SkillMarkdownEditor
						disabled={isMutating}
						onChange={setNewSkillBody}
						rows={16}
						toolMentions={toolMentionOptions}
						value={newSkillBody}
					/>
				</div>
			);
		}

		return null;
	})();

	const modalFooter = (() => {
		if (editorTarget?.kind === "template" && activeTemplate) {
			return (
				<div className="flex w-full flex-wrap items-center justify-between gap-2">
					<div className="text-muted-foreground text-xs">
						Template: {activeTemplate.name}
					</div>
					<div className="flex flex-wrap justify-end gap-2">
						<Button
							onClick={() => setEditorTarget(null)}
							size="sm"
							type="button"
							variant="ghost"
						>
							Close
						</Button>
						<BaseSubmitButton
							isSubmitting={isMutating}
							onClick={() => void handleSaveTemplateOverride(activeTemplate)}
							size="sm"
							type="button"
						>
							Save override
						</BaseSubmitButton>
						{activeTemplate.hasOverride && (
							<Button
								disabled={isMutating}
								onClick={() => void handleResetTemplate(activeTemplate)}
								size="sm"
								type="button"
								variant="outline"
							>
								Reset to default
							</Button>
						)}
					</div>
				</div>
			);
		}

		if (editorTarget?.kind === "custom" && activeCustomSkill) {
			const customSkillContent =
				customSkillDrafts[activeCustomSkill.id] ?? activeCustomSkill.content;
			const parsedCustomContent = parseSkillEditorContent({
				content: customSkillContent,
				canonicalFileName: activeCustomSkill.name,
			});
			const canonicalFileName = toCanonicalSkillFileNameFromFrontmatterName(
				parsedCustomContent.name
			);
			const canonicalContent = canonicalFileName
				? serializeSkillEditorContent({
						name: normalizeSkillFrontmatterName(canonicalFileName),
						description: parsedCustomContent.description,
						body: parsedCustomContent.body,
					})
				: "";

			return (
				<div className="flex w-full justify-end gap-2">
					<Button
						onClick={() => setEditorTarget(null)}
						size="sm"
						type="button"
						variant="ghost"
					>
						Close
					</Button>
					<BaseSubmitButton
						disabled={!canonicalFileName}
						isSubmitting={isMutating}
						onClick={() =>
							void updateSkillMutation.mutateAsync({
								websiteSlug: website.slug,
								aiAgentId: aiAgent.id,
								skillDocumentId: activeCustomSkill.id,
								name: canonicalFileName,
								content: canonicalContent,
							})
						}
						size="sm"
						type="button"
					>
						Save skill
					</BaseSubmitButton>
				</div>
			);
		}

		if (editorTarget?.kind === "system" && activeSystemSkill) {
			return (
				<div className="flex w-full justify-end gap-2">
					<Button
						onClick={() => setEditorTarget(null)}
						size="sm"
						type="button"
						variant="ghost"
					>
						Close
					</Button>
					<BaseSubmitButton
						isSubmitting={isMutating}
						onClick={() =>
							void upsertCoreMutation.mutateAsync({
								websiteSlug: website.slug,
								aiAgentId: aiAgent.id,
								name: activeSystemSkill.name,
								content:
									systemDrafts[activeSystemSkill.name] ??
									activeSystemSkill.content,
								enabled: true,
								priority: activeSystemSkill.priority,
							})
						}
						size="sm"
						type="button"
					>
						Save system skill
					</BaseSubmitButton>
				</div>
			);
		}

		if (editorTarget?.kind === "create-custom") {
			const normalizedNewSkillName =
				toCanonicalSkillFileNameFromFrontmatterName(newSkillName);

			return (
				<div className="flex w-full justify-end gap-2">
					<Button
						onClick={() => setEditorTarget(null)}
						size="sm"
						type="button"
						variant="ghost"
					>
						Close
					</Button>
					<Button
						disabled={
							isMutating || !normalizedNewSkillName || !newSkillBody.trim()
						}
						onClick={() => void handleCreateCustomSkill()}
						size="sm"
						type="button"
					>
						Create skill
					</Button>
				</div>
			);
		}

		return null;
	})();

	return (
		<SettingsPage>
			<SettingsHeader>Skills</SettingsHeader>
			<PageContent className="py-30">
				<div className="space-y-8">
					<SettingsRow
						description="Enable default templates for runtime and customize their markdown when needed."
						title="Default Skills (Templates)"
					>
						<div className="space-y-3 p-4">
							{studio.defaultSkillTemplates.map((template) => (
								<div
									className="space-y-3 rounded-md border border-border/60 p-3"
									key={template.name}
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<p className="font-medium text-sm">{template.label}</p>
												<Badge
													className={cn(
														template.isEnabled
															? "bg-green-500/15 text-green-600"
															: "bg-muted text-muted-foreground"
													)}
													variant="secondary"
												>
													{template.isEnabled ? "Enabled" : "Template only"}
												</Badge>
												{template.hasOverride && (
													<Badge variant="outline">Override</Badge>
												)}
											</div>
											<p className="text-muted-foreground text-xs">
												{template.description}
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												onClick={() =>
													setEditorTarget({
														kind: "template",
														templateName: template.name,
													})
												}
												size="sm"
												type="button"
												variant="outline"
											>
												Edit
											</Button>
											<Switch
												aria-label={`Toggle ${template.label}`}
												checked={template.isEnabled}
												disabled={isMutating}
												onCheckedChange={(checked) =>
													void handleEnableTemplate(template, checked)
												}
											/>
											{template.hasOverride && (
												<Button
													disabled={isMutating}
													onClick={() => void handleResetTemplate(template)}
													size="sm"
													type="button"
													variant="outline"
												>
													Reset to default
												</Button>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
						<SettingsRowFooter className="flex justify-end">
							<p className="text-muted-foreground text-xs">
								Runtime enforcement comes from Tools and General settings.
							</p>
						</SettingsRowFooter>
					</SettingsRow>

					<SettingsRow
						description="Create, edit, and enable markdown skills for your own workflows."
						title="Custom Skills (Markdown)"
					>
						<div className="space-y-4 p-4">
							<div className="flex items-center justify-between rounded-md border border-border/70 border-dashed p-3">
								<div className="space-y-1">
									<p className="font-medium text-sm">Create custom skill</p>
									<p className="text-muted-foreground text-xs">
										Open the editor to draft a reusable skill.
									</p>
								</div>
								<Button
									onClick={() => setEditorTarget({ kind: "create-custom" })}
									size="sm"
									type="button"
								>
									Create skill
								</Button>
							</div>

							{customSkills.map((skill) => (
								<div
									className="space-y-3 rounded-md border border-border/60 p-3"
									key={skill.id}
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<p className="font-medium text-sm">{skill.name}</p>
												<Badge
													className={cn(
														skill.enabled
															? "bg-green-500/15 text-green-600"
															: "bg-muted text-muted-foreground"
													)}
													variant="secondary"
												>
													{skill.enabled ? "Enabled" : "Disabled"}
												</Badge>
											</div>
											<p className="text-muted-foreground text-xs">
												Priority {skill.priority}
											</p>
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<Button
												onClick={() =>
													setEditorTarget({
														kind: "custom",
														skillId: skill.id,
													})
												}
												size="sm"
												type="button"
												variant="outline"
											>
												Edit
											</Button>
											<Switch
												aria-label={`Toggle ${skill.name}`}
												checked={skill.enabled}
												disabled={isMutating}
												onCheckedChange={(checked) =>
													void toggleSkillMutation.mutateAsync({
														websiteSlug: website.slug,
														aiAgentId: aiAgent.id,
														skillDocumentId: skill.id,
														enabled: checked,
													})
												}
											/>
											<Button
												disabled={isMutating}
												onClick={() =>
													void deleteSkillMutation.mutateAsync({
														websiteSlug: website.slug,
														aiAgentId: aiAgent.id,
														skillDocumentId: skill.id,
													})
												}
												size="sm"
												type="button"
												variant="destructive"
											>
												Delete
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					</SettingsRow>

					<SettingsRow
						description="Advanced core prompt layers that shape global runtime behavior and safeguards."
						title="Advanced Prompt Layers"
					>
						<div className="space-y-3 p-4">
							{studio.systemSkillDocuments.map((systemSkill) => (
								<div
									className="space-y-3 rounded-md border border-border/60 p-3"
									key={systemSkill.name}
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<p className="font-medium text-sm">
													{systemSkill.label}
												</p>
												<Badge variant="outline">{systemSkill.name}</Badge>
												<Badge variant="secondary">
													Source: {systemSkill.source}
												</Badge>
											</div>
											<p className="text-muted-foreground text-xs">
												{systemSkill.description}
											</p>
										</div>
										<Button
											onClick={() =>
												setEditorTarget({
													kind: "system",
													skillName: systemSkill.name,
												})
											}
											size="sm"
											type="button"
											variant="outline"
										>
											Edit
										</Button>
									</div>
								</div>
							))}
						</div>
						<SettingsRowFooter className="flex justify-end">
							<p className="text-muted-foreground text-xs">
								These layers alter the agent&apos;s global behavior. Edit with
								care.
							</p>
						</SettingsRowFooter>
					</SettingsRow>
				</div>
			</PageContent>

			<PromptEditModal
				footer={modalFooter}
				onOpenChange={(open) => {
					if (!open) {
						setEditorTarget(null);
					}
				}}
				open={editorTarget !== null}
				title={editorTitle}
			>
				{modalBody}
			</PromptEditModal>
		</SettingsPage>
	);
}
