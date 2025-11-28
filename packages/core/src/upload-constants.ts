/**
 * File upload constants for cost/API protection.
 * These limits are enforced on both client and server side.
 */

/** Maximum file size in bytes (5 MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum number of files per message */
export const MAX_FILES_PER_MESSAGE = 3;

/** Allowed MIME types for file uploads */
export const ALLOWED_MIME_TYPES = [
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	// Documents
	"application/pdf",
	// Text files
	"text/plain",
	"text/csv",
	"text/markdown",
	// Archives
	"application/zip",
] as const;

/** Human-readable file type descriptions for error messages */
export const ALLOWED_FILE_TYPES_DESCRIPTION =
	"images (JPEG, PNG, GIF, WebP), PDF, text files (TXT, CSV, MD), and ZIP archives";

/** Accept string for file input elements */
export const FILE_INPUT_ACCEPT = ALLOWED_MIME_TYPES.join(",");

/**
 * Check if a MIME type is allowed for upload
 */
export function isAllowedMimeType(mimeType: string): boolean {
	return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Check if a file is an image based on MIME type
 */
export function isImageMimeType(mimeType: string): boolean {
	return mimeType.startsWith("image/");
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate a file against upload constraints
 * @returns null if valid, error message if invalid
 */
export function validateFile(file: File): string | null {
	if (file.size > MAX_FILE_SIZE) {
		return `File "${file.name}" exceeds maximum size of ${formatFileSize(MAX_FILE_SIZE)}`;
	}

	if (!isAllowedMimeType(file.type)) {
		return `File type "${file.type || "unknown"}" is not allowed. Allowed types: ${ALLOWED_FILE_TYPES_DESCRIPTION}`;
	}

	return null;
}

/**
 * Validate multiple files against upload constraints
 * @returns null if all valid, error message if any invalid
 */
export function validateFiles(files: File[]): string | null {
	if (files.length > MAX_FILES_PER_MESSAGE) {
		return `Cannot attach more than ${MAX_FILES_PER_MESSAGE} files per message`;
	}

	for (const file of files) {
		const error = validateFile(file);
		if (error) {
			return error;
		}
	}

	return null;
}
