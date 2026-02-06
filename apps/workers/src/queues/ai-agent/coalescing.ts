export type QueueMessageMetadata = {
	id: string;
	userId: string | null;
	visitorId: string | null;
};

export function isTriggerableMessage(metadata: QueueMessageMetadata): boolean {
	return Boolean(metadata.userId || metadata.visitorId);
}

export function isVisitorTrigger(metadata: QueueMessageMetadata): boolean {
	return Boolean(metadata.visitorId) && !metadata.userId;
}

export function resolveCoalescedVisitorBatch<
	T extends QueueMessageMetadata,
>(params: {
	headMessage: T;
	orderedMessageIds: string[];
	metadataById: Map<string, T>;
}): {
	effectiveMessage: T;
	coalescedMessageIds: string[];
} {
	let effectiveMessage = params.headMessage;
	const coalescedMessageIds = [params.headMessage.id];

	if (!isVisitorTrigger(params.headMessage)) {
		return {
			effectiveMessage,
			coalescedMessageIds,
		};
	}

	for (const messageId of params.orderedMessageIds.slice(1)) {
		const metadata = params.metadataById.get(messageId);
		if (!metadata) {
			break;
		}
		if (!isTriggerableMessage(metadata)) {
			break;
		}
		if (!isVisitorTrigger(metadata)) {
			break;
		}

		coalescedMessageIds.push(metadata.id);
		effectiveMessage = metadata;
	}

	return {
		effectiveMessage,
		coalescedMessageIds,
	};
}
