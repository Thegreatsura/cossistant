"use client";

import * as Primitive from "@cossistant/next/primitives";
import type React from "react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { TooltipOnHover } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type MultimodalInputProps = {
	className?: string;
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onFileSelect?: (files: File[]) => void;
	placeholder?: string;
	disabled?: boolean;
	isSubmitting?: boolean;
	error?: Error | null;
	files?: File[];
	onRemoveFile?: (index: number) => void;
	maxFiles?: number;
	maxFileSize?: number;
	allowedFileTypes?: string[];
};

export const MultimodalInput: React.FC<MultimodalInputProps> = ({
	className,
	value,
	onChange,
	onSubmit,
	onFileSelect,
	placeholder = "Type your message...",
	disabled = false,
	isSubmitting = false,
	error,
	files = [],
	onRemoveFile,
	maxFiles = 5,
	maxFileSize = 10 * 1024 * 1024, // 10MB
	allowedFileTypes = ["image/*", "application/pdf", "text/*"],
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!(disabled || isSubmitting) && (value.trim() || files.length > 0)) {
			onSubmit();
		}
	};

	const handleAttachClick = () => {
		if (files.length < maxFiles) {
			fileInputRef.current?.click();
		}
	};

	const formatFileSize = (bytes: number) => {
		if (bytes < 1024) {
			return `${bytes} B`;
		}
		if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(1)} KB`;
		}
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const canSubmit =
		!(disabled || isSubmitting) &&
		(value.trim().length > 0 || files.length > 0);

	return (
		<div className="absolute right-0 bottom-4 left-0 z-10 mx-auto w-full px-4 xl:max-w-xl xl:px-0 2xl:max-w-2xl">
			<form className="flex flex-col gap-2" onSubmit={handleFormSubmit}>
				{/* Error message */}
				{error && (
					<div className="rounded-md bg-destructive-muted p-2 text-destructive text-xs">
						{error.message}
					</div>
				)}

				{/* File attachments */}
				{files.length > 0 && (
					<div className="flex flex-wrap gap-2 p-2">
						{files.map((file, index) => (
							<div
								className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs"
								key={`${file.name}-${index}`}
							>
								<Icon className="h-3 w-3" name="attachment" />
								<span className="max-w-[150px] truncate">{file.name}</span>
								<span className="text-muted-foreground">
									{formatFileSize(file.size)}
								</span>
								{onRemoveFile && (
									<TooltipOnHover content="Remove file">
										<Button
											className="ml-1"
											onClick={() => onRemoveFile(index)}
											size="icon-small"
											type="button"
											variant="ghost"
										>
											<Icon className="h-3 w-3" name="x" />
										</Button>
									</TooltipOnHover>
								)}
							</div>
						))}
					</div>
				)}

				{/* Input area */}
				<div className="flex flex-col rounded border border-border/50 bg-background-100 drop-shadow-xs dark:border-border/50 dark:bg-background-400">
					<Primitive.MultimodalInput
						className={cn(
							"flex-1 resize-none overflow-hidden p-3 text-foreground text-sm placeholder:text-primary/50 focus-visible:outline-none",
							className
						)}
						disabled={disabled || isSubmitting}
						error={error}
						onChange={onChange}
						onFileSelect={onFileSelect}
						onSubmit={onSubmit}
						placeholder={placeholder}
						value={value}
					/>

					<div className="flex items-center justify-end py-2 pr-1 pl-3">
						<div className="flex items-center gap-0.5">
							{/* File attachment button */}
							{onFileSelect && (
								<>
									<TooltipOnHover content="Attach files">
										<Button
											className={cn(files.length >= maxFiles && "opacity-50")}
											disabled={
												disabled || isSubmitting || files.length >= maxFiles
											}
											onClick={handleAttachClick}
											size="icon"
											type="button"
											variant="ghost"
										>
											<Icon className="h-4 w-4" name="attachment" />
										</Button>
									</TooltipOnHover>

									<Primitive.FileInput
										accept={allowedFileTypes.join(",")}
										className="hidden"
										disabled={
											disabled || isSubmitting || files.length >= maxFiles
										}
										onFileSelect={onFileSelect}
										ref={fileInputRef}
									/>
								</>
							)}

							<TooltipOnHover
								content="Send message"
								shortcuts={["mod", "enter"]}
							>
								<Button
									disabled={!canSubmit || isSubmitting}
									size="icon"
									variant="ghost"
								>
									<Icon className="h-4 w-4" name="send" />
								</Button>
							</TooltipOnHover>
						</div>
					</div>
				</div>
			</form>
		</div>
	);
};
