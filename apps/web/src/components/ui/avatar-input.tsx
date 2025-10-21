"use client";

import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ImageIcon, UploadIcon, XIcon } from "lucide-react";

import {
	AvatarContainer,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const DEFAULT_ACCEPT =
	"image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml";

export type AvatarInputValue = {
	/** Object URL or remote URL used for previewing the avatar. */
	previewUrl: string;
	/** Remote URL after uploading to storage (optional). */
	url?: string;
	/** The underlying file that was selected (optional). */
	file?: File;
	/** MIME type of the avatar. */
	mimeType: string;
	/** Original filename (best effort). */
	name?: string;
	/** File size in bytes. */
	size?: number;
};

export type AvatarInputOnUpload = (
	file: File
) => Promise<
	void | string | Partial<Omit<AvatarInputValue, "file" | "previewUrl">>
>;

export interface AvatarInputProps
	extends React.ComponentPropsWithoutRef<"div"> {
	value?: AvatarInputValue | string | null;
	onChange?: (value: AvatarInputValue | null) => void;
	/** Optional description rendered under the controls. */
	description?: React.ReactNode;
	/** Aspect ratio used for the cropper (default: 1 / 1). */
	aspectRatio?: number;
	/** Accept attribute for the underlying file input. */
	accept?: string;
	/** Callback fired before starting an upload (useful for analytics). */
	onUploadStart?: (file: File) => void;
	/** Callback fired after upload successfully completed. */
	onUploadComplete?: (payload: AvatarInputValue) => void;
	/** Error handler invoked when selecting, cropping or uploading fails. */
	onError?: (error: Error) => void;
	/** Optional helper to automatically upload to S3 using a pre-signed URL. */
	presignedUrl?: string;
	/** Custom headers used when uploading to the pre-signed URL. */
	uploadHeaders?: HeadersInit;
	/** Custom upload handler, useful for integrating with mutations or APIs. */
	onUpload?: AvatarInputOnUpload;
	/** Whether removing the avatar is allowed (default true). */
	allowRemove?: boolean;
	/** Text shown on the upload button (default: "Upload"/"Change"). */
	uploadLabel?: string;
	/** Placeholder text shown next to the preview. */
	placeholder?: React.ReactNode;
	/** Display initials in the fallback avatar. */
	fallbackInitials?: string;
	/** Optional className applied to the preview container. */
	previewClassName?: string;
	/** Name passed down to the hidden input for React Hook Form compatibility. */
	name?: string;
	/** Blur handler forwarded to the hidden input for React Hook Form. */
	onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

type CropState = {
	file: File;
	objectUrl: string;
	name?: string;
};

type CommitFileOptions = {
	skipUpload?: boolean;
	objectUrlOverride?: string;
};

function getFileExtension(name?: string) {
	if (!name) return "";
	const lastDot = name.lastIndexOf(".");
	if (lastDot === -1) return "";
	return name.slice(lastDot);
}

async function readFileAsObjectUrl(file: File) {
	return URL.createObjectURL(file);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Failed to load image"));
		image.src = src;
	});
}

async function cropImage({
	file,
	cropArea,
	source,
}: {
	file: File;
	cropArea: Area;
	source: string;
}): Promise<File> {
	const image = await loadImage(source);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	if (!ctx) {
		throw new Error("Failed to acquire 2D context for cropping");
	}

	canvas.width = cropArea.width;
	canvas.height = cropArea.height;

	ctx.drawImage(
		image,
		cropArea.x,
		cropArea.y,
		cropArea.width,
		cropArea.height,
		0,
		0,
		cropArea.width,
		cropArea.height
	);

	const outputType =
		file.type && file.type !== "image/svg+xml" ? file.type : "image/png";
	const extension =
		outputType === "image/png" ? ".png" : getFileExtension(file.name) || ".jpg";

	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((generated) => {
			if (!generated) {
				reject(new Error("Failed to generate cropped image"));
				return;
			}
			resolve(generated);
		}, outputType);
	});

	return new File(
		[blob],
		`${file.name.replace(/\.[^/.]+$/, "") || "avatar"}-cropped${extension}`,
		{
			type: outputType,
			lastModified: Date.now(),
		}
	);
}

export type UploadToPresignedUrlOptions = {
	file: Blob;
	url: string;
	method?: string;
	headers?: HeadersInit;
	onProgress?: (progress: number) => void;
};

export async function uploadToPresignedUrl({
	file,
	url,
	method = "PUT",
	headers,
	onProgress,
}: UploadToPresignedUrlOptions): Promise<Response> {
	if (
		typeof window !== "undefined" &&
		typeof XMLHttpRequest !== "undefined" &&
		onProgress
	) {
		return new Promise<Response>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.open(method, url);

			if (headers) {
				const entries =
					headers instanceof Headers
						? headers.entries()
						: Object.entries(headers);
				for (const [key, value] of entries) {
					if (value !== undefined) {
						request.setRequestHeader(
							key,
							Array.isArray(value) ? value.join(",") : value
						);
					}
				}
			}

			request.upload.onprogress = (event) => {
				if (event.lengthComputable) {
					onProgress(event.loaded / event.total);
				}
			};

			request.responseType = "blob";

			request.onerror = () => {
				reject(new Error("Failed to upload file to pre-signed URL"));
			};

			request.onload = () => {
				const response = new Response(request.response, {
					status: request.status,
					statusText: request.statusText,
				});
				if (!response.ok) {
					reject(new Error(`Upload failed with status ${request.status}`));
					return;
				}
				resolve(response);
			};

			request.send(file);
		});
	}

	const response = await fetch(url, {
		method,
		headers,
		body: file,
	});

	if (!response.ok) {
		throw new Error(`Upload failed with status ${response.status}`);
	}

	onProgress?.(1);

	return response;
}

export const AvatarInput =
	/*#__PURE__*/
	forwardRef<HTMLInputElement, AvatarInputProps>(function AvatarInput(
		{
			value,
			onChange,
			description,
			aspectRatio = 1,
			accept = DEFAULT_ACCEPT,
			onUploadStart,
			onUploadComplete,
			onUpload,
			onError,
			presignedUrl,
			uploadHeaders,
			allowRemove = true,
			uploadLabel,
			placeholder,
			fallbackInitials,
			previewClassName,
			disabled,
			name,
			onBlur,
			id,
			className,
			...rest
		},
		forwardedRef
	) {
		const hiddenInputRef = useRef<HTMLInputElement | null>(null);
		useImperativeHandle(
			forwardedRef,
			() => hiddenInputRef.current as HTMLInputElement,
			[]
		);

		const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
		const [isUploading, setIsUploading] = useState(false);
		const [cropState, setCropState] = useState<CropState | null>(null);
		const [crop, setCrop] = useState({ x: 0, y: 0 });
		const [zoom, setZoom] = useState(1.2);
		const [croppedArea, setCroppedArea] = useState<Area | null>(null);

		const resolvedValue: AvatarInputValue | null = useMemo(() => {
			if (!value) {
				return null;
			}

			if (typeof value === "string") {
				return {
					previewUrl: value,
					url: value,
					mimeType: "",
				};
			}

			return value;
		}, [value]);

		const resolvedPreviewUrl =
			localPreviewUrl ?? resolvedValue?.previewUrl ?? resolvedValue?.url;

		useEffect(() => {
			return () => {
				setLocalPreviewUrl((previous) => {
					if (previous) {
						URL.revokeObjectURL(previous);
					}
					return null;
				});
			};
		}, []);

		useEffect(() => {
			if (!value) {
				setLocalPreviewUrl((previous) => {
					if (previous) {
						URL.revokeObjectURL(previous);
					}
					return null;
				});
			}
		}, [value]);

		const commitFile = useCallback(
			async (
				file: File,
				{ skipUpload, objectUrlOverride }: CommitFileOptions = {}
			) => {
				const nextPreviewUrl =
					objectUrlOverride ?? (await readFileAsObjectUrl(file));

				setLocalPreviewUrl((previous) => {
					if (previous && previous !== nextPreviewUrl) {
						URL.revokeObjectURL(previous);
					}
					return nextPreviewUrl;
				});

				const payload: AvatarInputValue = {
					previewUrl: nextPreviewUrl,
					file,
					mimeType: file.type,
					name: file.name,
					size: file.size,
				};

				try {
					onUploadStart?.(file);
					if (!skipUpload && (onUpload || presignedUrl)) {
						setIsUploading(true);

						if (onUpload) {
							const result = await onUpload(file);

							if (typeof result === "string") {
								payload.url = result;
							} else if (result && typeof result === "object") {
								Object.assign(payload, result);
							}
						}

						if (presignedUrl) {
							await uploadToPresignedUrl({
								file,
								url: presignedUrl,
								headers: uploadHeaders,
							});
							payload.url = presignedUrl.split("?")[0] ?? presignedUrl;
						}
					}

					onChange?.(payload);
					onUploadComplete?.(payload);
				} catch (error) {
					const message =
						error instanceof Error
							? error
							: new Error("Unexpected error while uploading avatar");
					onError?.(message);
					setLocalPreviewUrl((previous) => {
						if (previous) {
							URL.revokeObjectURL(previous);
						}
						return resolvedValue?.previewUrl ?? resolvedValue?.url ?? null;
					});
					throw message;
				} finally {
					setIsUploading(false);
					hiddenInputRef.current?.dispatchEvent(
						new Event("input", { bubbles: true })
					);
				}
			},
			[
				onUploadStart,
				onUpload,
				presignedUrl,
				uploadHeaders,
				onChange,
				onUploadComplete,
				onError,
				resolvedValue?.previewUrl,
				resolvedValue?.url,
			]
		);

		const handleFileSelection = useCallback(
			async (event: React.ChangeEvent<HTMLInputElement>) => {
				const file = event.target.files?.[0];
				event.target.value = "";

				if (!file) {
					return;
				}

				const mimeType = file.type.toLowerCase();
				const isSvg = mimeType === "image/svg+xml";

				try {
					if (isSvg) {
						const objectUrl = await readFileAsObjectUrl(file);
						await commitFile(file, { objectUrlOverride: objectUrl });
						return;
					}

					const objectUrl = await readFileAsObjectUrl(file);
					setCropState({
						file,
						objectUrl,
						name: file.name,
					});
					setZoom(1.2);
					setCrop({ x: 0, y: 0 });
				} catch (error) {
					const message =
						error instanceof Error
							? error
							: new Error("Failed to prepare selected image");
					onError?.(message);
				}
			},
			[commitFile, onError]
		);

		const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
			setCroppedArea(croppedAreaPixels);
		}, []);

		const closeCropper = useCallback(() => {
			setCropState((current) => {
				if (current) {
					URL.revokeObjectURL(current.objectUrl);
				}
				return null;
			});
			setCroppedArea(null);
		}, []);

		const applyCrop = useCallback(async () => {
			if (!cropState || !croppedArea) {
				closeCropper();
				return;
			}

			try {
				const croppedFile = await cropImage({
					file: cropState.file,
					cropArea: croppedArea,
					source: cropState.objectUrl,
				});
				await commitFile(croppedFile);
			} catch (error) {
				const message =
					error instanceof Error
						? error
						: new Error("Unable to crop selected image");
				onError?.(message);
			} finally {
				closeCropper();
			}
		}, [commitFile, cropState, croppedArea, closeCropper, onError]);

		const removeAvatar = useCallback(() => {
			setLocalPreviewUrl((previous) => {
				if (previous) {
					URL.revokeObjectURL(previous);
				}
				return null;
			});
			onChange?.(null);
		}, [onChange]);

		const uploadButtonLabel =
			uploadLabel ?? (resolvedPreviewUrl ? "Change" : "Upload");

		const showPlaceholder = !resolvedPreviewUrl && placeholder;

		return (
			<div className={cn("flex flex-col gap-3", className)} {...rest}>
				<input
					ref={(node) => {
						hiddenInputRef.current = node;
						if (typeof forwardedRef === "function") {
							forwardedRef(node);
						} else if (forwardedRef) {
							(
								forwardedRef as React.MutableRefObject<HTMLInputElement | null>
							).current = node;
						}
					}}
					type="hidden"
					id={id}
					name={name}
					onBlur={onBlur}
					value={typeof value === "string" ? value : (value?.url ?? "")}
				/>
				<div className="flex items-start gap-4">
					<div className={cn("relative", previewClassName)}>
						<AvatarContainer
							className={cn(
								"size-24 rounded-md border border-dashed border-border/70 bg-muted/40",
								disabled && "opacity-70"
							)}
						>
							{resolvedPreviewUrl ? (
								<AvatarImage alt="Avatar preview" src={resolvedPreviewUrl} />
							) : (
								<div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
									<ImageIcon className="size-5" />
									<span className="text-xs">Preview</span>
								</div>
							)}
							<AvatarFallback className="text-base">
								{fallbackInitials ??
									(resolvedValue?.name ? resolvedValue.name[0] : "")}
							</AvatarFallback>
						</AvatarContainer>
						{isUploading && (
							<div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/70">
								<Spinner className="text-primary" />
							</div>
						)}
					</div>
					<div className="flex flex-1 flex-col gap-2 text-sm">
						{showPlaceholder && (
							<p className="text-muted-foreground text-sm">{placeholder}</p>
						)}
						<div className="flex flex-wrap items-center gap-2">
							<label>
								<input
									accept={accept}
									className="sr-only"
									disabled={disabled || isUploading}
									onChange={handleFileSelection}
									type="file"
								/>
								<Button
									disabled={disabled || isUploading}
									size="sm"
									type="button"
									variant="outline"
								>
									<UploadIcon className="size-4" />
									{isUploading ? "Uploading" : uploadButtonLabel}
								</Button>
							</label>
							{allowRemove && (resolvedPreviewUrl || resolvedValue) && (
								<Button
									disabled={disabled || isUploading}
									onClick={removeAvatar}
									size="sm"
									type="button"
									variant="ghost"
								>
									<XIcon className="size-4" />
									Remove
								</Button>
							)}
						</div>
						{description && (
							<p className="text-muted-foreground text-xs">{description}</p>
						)}
					</div>
				</div>
				<Dialog
					open={Boolean(cropState)}
					onOpenChange={(open) => !open && closeCropper()}
				>
					<DialogContent className="sm:max-w-[480px]">
						<DialogHeader>
							<DialogTitle>Crop image</DialogTitle>
							<DialogDescription>
								Adjust the crop to choose the portion you want to keep as your
								avatar.
							</DialogDescription>
						</DialogHeader>
						<div className="mt-2 flex flex-col gap-4">
							<div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
								{cropState && (
									<Cropper
										aspect={aspectRatio}
										crop={crop}
										image={cropState.objectUrl}
										onCropChange={setCrop}
										onCropComplete={onCropComplete}
										onZoomChange={setZoom}
										zoom={zoom}
										zoomSpeed={0.5}
										showGrid={false}
									/>
								)}
							</div>
							<div className="flex items-center gap-3">
								<span className="text-xs text-muted-foreground">Zoom</span>
								<input
									className="w-full"
									max={3}
									min={1}
									onChange={(event) =>
										setZoom(Number.parseFloat(event.target.value))
									}
									step={0.1}
									type="range"
									value={zoom}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button onClick={closeCropper} type="button" variant="ghost">
								Cancel
							</Button>
							<Button onClick={applyCrop} type="button">
								Apply
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		);
	});
