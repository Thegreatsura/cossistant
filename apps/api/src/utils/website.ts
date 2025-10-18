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
			return agentTime > mostRecent ? agentTime : mostRecent;
		},
		0
	);

	return new Date(mostRecentTimestamp).toISOString();
};
