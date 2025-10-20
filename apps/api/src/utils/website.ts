/**
 * Gets the most recent lastOnlineAt timestamp from available human agents
 * @param availableHumanAgents Array of human agents with lastSeenAt timestamps
 * @returns ISO string of the most recent lastSeenAt, or current time if no agents available
 */
export const getMostRecentLastOnlineAt = (
	availableHumanAgents: Array<{ lastSeenAt: string }>
): string => {
	if (availableHumanAgents.length === 0) {
		return new Date().toISOString();
	}

	const mostRecentTimestamp = availableHumanAgents.reduce(
		(mostRecent, agent) => {
			const agentTime = new Date(agent.lastSeenAt).getTime();
			// Skip invalid dates (NaN)
			if (Number.isNaN(agentTime)) {
				return mostRecent;
			}
			return agentTime > mostRecent ? agentTime : mostRecent;
		},
		new Date(availableHumanAgents[0].lastSeenAt).getTime()
	);

	// Fall back to current time if all dates were invalid
	return Number.isNaN(mostRecentTimestamp)
		? new Date().toISOString()
		: new Date(mostRecentTimestamp).toISOString();
};
