"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useCallback } from "react";
import { KnowledgePreviewModal } from "@/components/modals/knowledge-preview-modal";

type KnowledgePreviewWrapperProps = {
	websiteSlug: string;
};

/**
 * Wrapper component that manages the knowledge preview modal state
 * using URL query parameters. When a page tree item is clicked,
 * it sets the `knowledge` query param which this component reads
 * to show the preview modal.
 */
export function KnowledgePreviewWrapper({
	websiteSlug,
}: KnowledgePreviewWrapperProps) {
	const [knowledgeId, setKnowledgeId] = useQueryState(
		"knowledge",
		parseAsString
	);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				void setKnowledgeId(null);
			}
		},
		[setKnowledgeId]
	);

	return (
		<KnowledgePreviewModal
			knowledgeId={knowledgeId ?? ""}
			onOpenChange={handleOpenChange}
			open={Boolean(knowledgeId)}
			websiteSlug={websiteSlug}
		/>
	);
}
