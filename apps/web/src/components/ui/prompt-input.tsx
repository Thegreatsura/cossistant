"use client";

import { Maximize2, X } from "lucide-react";
import type * as React from "react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PromptInputProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	maxLength?: number;
	disabled?: boolean;
	className?: string;
	label?: string;
	description?: string;
	error?: string;
	rows?: number;
};

export function PromptInput({
	value,
	onChange,
	placeholder = "Enter your prompt...",
	maxLength = 10_000,
	disabled = false,
	className,
	label,
	description,
	error,
	rows = 8,
}: PromptInputProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const characterCount = value.length;
	const isOverLimit = characterCount > maxLength;
	const isNearLimit = characterCount > maxLength * 0.9;

	return (
		<div className="flex flex-col gap-2">
			{label && (
				<label className="font-medium text-sm" htmlFor="prompt-input">
					{label}
				</label>
			)}
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
			<div className="relative">
				<TooltipOnHover content="Expand prompt input" side="right">
					<Button
						className="absolute top-2 right-2 z-10"
						onClick={() => setIsDialogOpen(true)}
						size="icon-small"
						type="button"
						variant="ghost"
					>
						<Maximize2 />
					</Button>
				</TooltipOnHover>
				<div
					className={cn(
						"w-full overflow-hidden rounded border border-input bg-background-100/50 shadow-xs transition-[color,box-shadow]",
						"focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
						"dark:bg-background-200",
						isOverLimit &&
							"border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
						error &&
							"border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
						disabled && "cursor-not-allowed opacity-50",
						className
					)}
				>
					<ScrollArea
						className="max-h-[480px]"
						maskHeight="80px"
						orientation="vertical"
						scrollbarWidth="8px"
						scrollMask={true}
					>
						<textarea
							className={cn(
								"field-sizing-content flex w-full resize-none border-0 bg-transparent px-3 py-3 pt-10 font-mono text-sm outline-none",
								"placeholder:text-muted-foreground",
								"disabled:cursor-not-allowed"
							)}
							disabled={disabled}
							id="prompt-input"
							onChange={(e) => onChange(e.target.value)}
							placeholder={placeholder}
							ref={textareaRef}
							rows={rows}
							value={value}
						/>
					</ScrollArea>
				</div>
			</div>
			<div className="flex items-center justify-between">
				{error ? <p className="text-destructive text-xs">{error}</p> : <div />}
				<span
					className={cn(
						"text-muted-foreground text-xs tabular-nums",
						isNearLimit && "text-amber-500",
						isOverLimit && "text-destructive"
					)}
				>
					{characterCount.toLocaleString()} / {maxLength.toLocaleString()}
				</span>
			</div>

			{/* Full-screen Focus Mode Dialog */}
			<Dialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
				<DialogContent
					className="h-screen w-screen gap-0 rounded-none p-0 md:max-w-none"
					showCloseButton={false}
				>
					{/* Header */}
					<DialogHeader className="flex-row items-center justify-between px-6 py-4">
						<DialogTitle className="text-md">Prompt Editor</DialogTitle>
						<Button
							onClick={() => setIsDialogOpen(false)}
							size="icon-small"
							type="button"
							variant="ghost"
						>
							<X />
						</Button>
					</DialogHeader>

					{/* Main Content - Large Textarea */}
					<ScrollArea
						className="h-[calc(100vh-180px)] flex-1 p-3"
						orientation="vertical"
						scrollMask
					>
						<textarea
							autoFocus
							className={cn(
								"field-sizing-content h-content w-full resize-none rounded border-0 border-input bg-background p-3 font-mono text-sm outline-none transition-[color,box-shadow] focus:bg-background-200",
								"placeholder:text-muted-foreground",
								isOverLimit &&
									"border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
							)}
							onChange={(e) => onChange(e.target.value)}
							placeholder={placeholder}
							value={value}
						/>
					</ScrollArea>

					{/* Footer - Character Count */}
					<div className="flex items-center justify-end px-6 py-4">
						<span
							className={cn(
								"text-muted-foreground text-sm tabular-nums",
								isNearLimit && "text-amber-500",
								isOverLimit && "text-destructive"
							)}
						>
							{characterCount.toLocaleString()} / {maxLength.toLocaleString()}
						</span>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
