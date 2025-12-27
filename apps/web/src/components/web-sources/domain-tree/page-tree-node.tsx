"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useState } from "react";
import type { MergedPageNode } from "../utils";
import { PageTreeItemView } from "./page-tree-item";

type PageTreeNodeProps = {
	node: MergedPageNode;
	depth: number;
	websiteSlug: string;
	linkSourceId: string;
	onToggleIncluded: (knowledgeId: string, isIncluded: boolean) => void;
	onReindex?: (linkSourceId: string, knowledgeId: string) => void;
	onDelete?: (knowledgeId: string) => void;
	onIgnore?: (linkSourceId: string, knowledgeId: string) => void;
	onScanSubpages?: (linkSourceId: string, knowledgeId: string) => void;
	isToggling: boolean;
	isReindexing?: boolean;
	isDeleting?: boolean;
	isIgnoring?: boolean;
};

export function PageTreeNode({
	node,
	depth,
	websiteSlug,
	linkSourceId,
	onToggleIncluded,
	onReindex,
	onDelete,
	onIgnore,
	onScanSubpages,
	isToggling,
	isReindexing = false,
	isDeleting = false,
	isIgnoring = false,
}: PageTreeNodeProps) {
	const [isExpanded, setIsExpanded] = useState(depth < 2);
	const [, setKnowledgeId] = useQueryState("knowledge", parseAsString);

	const hasChildren = node.children.length > 0;
	const isGroup = hasChildren;

	const handleToggleExpand = useCallback(() => {
		setIsExpanded((prev) => !prev);
	}, []);

	const handleToggleIncluded = useCallback(() => {
		onToggleIncluded(node.knowledgeId, !node.isIncluded);
	}, [node.knowledgeId, node.isIncluded, onToggleIncluded]);

	const handleViewContent = useCallback(() => {
		void setKnowledgeId(node.knowledgeId);
	}, [node.knowledgeId, setKnowledgeId]);

	const handleReindex = useCallback(() => {
		onReindex?.(linkSourceId, node.knowledgeId);
	}, [linkSourceId, node.knowledgeId, onReindex]);

	const handleDelete = useCallback(() => {
		onDelete?.(node.knowledgeId);
	}, [node.knowledgeId, onDelete]);

	const handleIgnore = useCallback(() => {
		onIgnore?.(linkSourceId, node.knowledgeId);
	}, [linkSourceId, node.knowledgeId, onIgnore]);

	return (
		<div className="select-none">
			<PageTreeItemView
				depth={depth}
				hasChildren={hasChildren}
				isDeleting={isDeleting}
				isExpanded={isExpanded}
				isGroup={isGroup}
				isIgnoring={isIgnoring}
				isIncluded={node.isIncluded}
				isReindexing={isReindexing}
				isToggling={isToggling}
				onDelete={onDelete ? handleDelete : undefined}
				onIgnore={onIgnore ? handleIgnore : undefined}
				onReindex={onReindex ? handleReindex : undefined}
				onToggleExpand={handleToggleExpand}
				onToggleIncluded={handleToggleIncluded}
				onViewContent={handleViewContent}
				path={node.path}
				sizeBytes={node.sizeBytes}
				sourceUrl={node.linkSourceUrl}
				title={node.title}
				updatedAt={node.updatedAt}
				url={node.url}
			/>

			{/* Children */}
			{hasChildren && isExpanded && (
				<div>
					{node.children.map((child) => (
						<PageTreeNode
							depth={depth + 1}
							isDeleting={isDeleting}
							isIgnoring={isIgnoring}
							isReindexing={isReindexing}
							isToggling={isToggling}
							key={child.knowledgeId}
							linkSourceId={linkSourceId}
							node={child}
							onDelete={onDelete}
							onIgnore={onIgnore}
							onReindex={onReindex}
							onScanSubpages={onScanSubpages}
							onToggleIncluded={onToggleIncluded}
							websiteSlug={websiteSlug}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export type { PageTreeNodeProps };
