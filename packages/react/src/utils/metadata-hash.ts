/**
 * Computes a deterministic hash from metadata object.
 * This is used to check if metadata has changed without comparing the entire object.
 * Returns a short hash string (first 8 characters of SHA256).
 *
 * Note: This uses SubtleCrypto API in the browser and crypto module in Node.js
 */
export async function computeMetadataHash(
	metadata: Record<string, unknown> | null | undefined
): Promise<string> {
	if (!metadata || Object.keys(metadata).length === 0) {
		return "";
	}

	// Sort keys to ensure deterministic output
	const sortedKeys = Object.keys(metadata).sort();
	const sortedMetadata = sortedKeys.reduce(
		(acc, key) => {
			acc[key] = metadata[key];
			return acc;
		},
		{} as Record<string, unknown>
	);

	// Create a stable string representation
	const metadataString = JSON.stringify(sortedMetadata);

	// Use SubtleCrypto in browser, crypto module in Node.js
	if (typeof window !== "undefined" && window.crypto?.subtle) {
		// Browser environment
		const encoder = new TextEncoder();
		const data = encoder.encode(metadataString);
		const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return hashHex.slice(0, 8);
	}

	// Node.js environment (for SSR)
	const crypto = await import("node:crypto");
	return crypto
		.createHash("sha256")
		.update(metadataString)
		.digest("hex")
		.slice(0, 8);
}
