export function filterSeenByIdsForViewer(
	seenByIds: readonly string[],
	viewerId?: string
): readonly string[] {
	if (!viewerId || seenByIds.length === 0) {
		return seenByIds;
	}

	if (!seenByIds.includes(viewerId)) {
		return seenByIds;
	}

	return seenByIds.filter((id) => id !== viewerId);
}
