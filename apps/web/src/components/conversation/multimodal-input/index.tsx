"use client";

import {
	FILE_INPUT_ACCEPT,
	formatFileSize,
	MAX_FILE_SIZE,
	MAX_FILES_PER_MESSAGE,
} from "@cossistant/core";
import type React from "react";
import { useLayoutEffect, useRef } from "react";
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
	isUploading?: boolean;
	uploadProgress?: number;
	error?: Error | null;
	files?: File[];
	onRemoveFile?: (index: number) => void;
	maxFiles?: number;
	maxFileSize?: number;
	allowedFileTypes?: string;
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
	isUploading = false,
	uploadProgress = 0,
	error,
	files = [],
	onRemoveFile,
	maxFiles = MAX_FILES_PER_MESSAGE,
	maxFileSize = MAX_FILE_SIZE,
	allowedFileTypes = FILE_INPUT_ACCEPT,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const hasContent = value.trim().length > 0 || files.length > 0;
	const canSubmit = !disabled && hasContent && !isUploading;

	// Auto-resize textarea with max height constraint
	useLayoutEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) {
			return;
		}

		// Reset height to auto to get accurate scrollHeight
		textarea.style.height = "auto";

		// Get the scroll height
		const scrollHeight = textarea.scrollHeight;

		textarea.style.height = `${scrollHeight}px`;
		textarea.style.overflowY = "hidden";
	}, [value]);

	const handleSubmit = () => {
		if (!canSubmit) {
			return;
		}

		onSubmit();
		// Focus textarea after submission
		textareaRef.current?.focus();
		requestAnimationFrame(() => {
			textareaRef.current?.focus();
		});
	};

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		handleSubmit();
	};

	const handleAttachClick = () => {
		if (files.length < maxFiles) {
			fileInputRef.current?.click();
		}
	};

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
					<div className="flex flex-col gap-2 p-2">
						{/* Upload progress indicator */}
						{isUploading && (
							<div className="flex items-center gap-2 text-muted-foreground text-xs">
								<div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
									<div
										className="h-full bg-primary transition-all duration-300"
										style={{ width: `${uploadProgress}%` }}
									/>
								</div>
								<span>Uploading {uploadProgress}%</span>
							</div>
						)}
						<div className="flex flex-wrap gap-2">
							{files.map((file, index) => (
								<div
									className={cn(
										"flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs",
										isUploading && "opacity-70"
									)}
									key={`${file.name}-${index}`}
								>
									<Icon className="h-3 w-3" name="attachment" />
									<span className="max-w-[150px] truncate">{file.name}</span>
									<span className="text-muted-foreground">
										{formatFileSize(file.size)}
									</span>
									{onRemoveFile && !isUploading && (
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
					</div>
				)}

				{/* Input area */}
				<div className="flex h-fit flex-col rounded-lg border border-border/50 bg-background-100 drop-shadow-xs dark:border-border/50 dark:bg-background-300">
					<div className="scrollbar-thin scrollbar-track-fd-overlay scrollbar-thumb-border/30 hover:scrollbar-thumb-border/50 max-h-[280px] overflow-y-scroll">
						<textarea
							aria-describedby={error ? "multimodal-input-error" : undefined}
							aria-invalid={error ? "true" : undefined}
							autoFocus
							className={cn(
								"min-h-[20px] w-full flex-1 resize-none p-3 text-foreground text-sm placeholder:text-primary/50 focus-visible:outline-none",
								className
							)}
							disabled={disabled}
							onChange={(e) => onChange(e.target.value)}
							onKeyDown={(e) => {
								// Handle Cmd/Ctrl + Enter to submit
								if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
									e.preventDefault();
									handleSubmit();
								}
							}}
							placeholder={placeholder}
							ref={textareaRef}
							rows={1}
							value={value}
						/>
					</div>
					<div className="flex items-center justify-end pr-1 pb-1 pl-3">
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

									<input
										accept={allowedFileTypes}
										className="hidden"
										disabled={
											disabled || isSubmitting || files.length >= maxFiles
										}
										multiple
										onChange={(e) => {
											const selectedFiles = Array.from(e.target.files || []);
											if (selectedFiles.length > 0) {
												onFileSelect(selectedFiles);
												// Reset input to allow selecting the same file again
												e.target.value = "";
											}
										}}
										ref={fileInputRef}
										type="file"
									/>
								</>
							)}

							<TooltipOnHover
								content={isUploading ? "Uploading files..." : "Send message"}
								shortcuts={isUploading ? undefined : ["mod", "enter"]}
							>
								<Button
									className={cn(
										canSubmit
											? "[&_svg]:text-primary/90"
											: "[&_svg]:text-primary/50"
									)}
									disabled={!canSubmit}
									size="icon"
									type="submit"
									variant="ghost"
								>
									{isUploading ? (
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
									) : (
										<Icon
											className={cn("size-4")}
											name="send"
											variant={canSubmit ? "filled" : "default"}
										/>
									)}
								</Button>
							</TooltipOnHover>
						</div>
					</div>
				</div>
			</form>
		</div>
	);
};
