"use client";

import { motion } from "motion/react";
import Icon from "@/components/ui/icons";

type PromptGeneratedConfirmationProps = {
	companyName?: string;
	websiteDescription?: string;
	manualDescription?: string;
	discoveredLinksCount?: number;
};

export function PromptGeneratedConfirmation({
	companyName,
	websiteDescription,
	manualDescription,
	discoveredLinksCount,
}: PromptGeneratedConfirmationProps) {
	const description = websiteDescription ?? manualDescription;

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className="rounded-lg border border-cossistant-green bg-cossistant-green/10 p-4"
			initial={{ opacity: 0, y: -10 }}
		>
			<div className="flex items-start gap-3">
				<Icon className="mt-0.5 size-4 text-cossistant-green" name="check" />
				<div className="min-w-0 flex-1">
					<p className="font-medium text-sm">
						System prompt generated
						{companyName && ` for ${companyName}`}
					</p>
					{description && (
						<p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
							{description}
						</p>
					)}
				</div>
			</div>
			{/* Discovered links count */}
			{discoveredLinksCount !== undefined && discoveredLinksCount > 0 && (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="mt-3 flex items-center gap-2 border-cossistant-green/30 border-t pt-3 pl-6"
					initial={{ opacity: 0, y: 5 }}
					transition={{ delay: 0.2 }}
				>
					<span className="text-sm">
						<span className="font-medium">{discoveredLinksCount}</span>{" "}
						<span className="text-muted-foreground">
							pages discovered for knowledge base
						</span>
					</span>
				</motion.div>
			)}
		</motion.div>
	);
}
