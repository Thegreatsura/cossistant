export const normalizeDomain = (domain: string): string => {
	const trimmed = domain.trim();

	if (!trimmed) {
		throw new Error("Domain cannot be empty");
	}

	const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
	const withoutPath = withoutProtocol.split(/[/?#]/, 1)[0] ?? "";
	const hostname = withoutPath.split(":", 1)[0]?.trim() ?? "";

	if (!hostname) {
		throw new Error("Domain cannot be empty");
	}

	return hostname.toLowerCase();
};
