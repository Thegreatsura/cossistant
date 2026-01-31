"use client";

import type { CategoryType } from "./types";

type CategoryHeaderProps = {
	category: CategoryType;
	label: string;
	count: number;
};

export function CategoryHeader({
	category,
	label,
	count,
}: CategoryHeaderProps) {
	const styles = CATEGORY_STYLES[category];

	return (
		<div className="flex h-full max-h-[48px] flex-col justify-end">
			<div
				className={
					"flex items-center gap-1 px-1 pb-1 font-medium text-primary/80 text-sm"
				}
			>
				<span>{label}</span>
				<span>[{count}]</span>
			</div>
		</div>
	);
}
