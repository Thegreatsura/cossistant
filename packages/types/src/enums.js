export const MessageType = {
	TEXT: "text",
	IMAGE: "image",
	FILE: "file",
};
export const SenderType = {
	VISITOR: "visitor",
	TEAM_MEMBER: "team_member",
	AI: "ai",
};
export const ConversationStatus = {
	OPEN: "open",
	RESOLVED: "resolved",
	SPAM: "spam",
};
export const ConversationPriority = {
	LOW: "low",
	NORMAL: "normal",
	HIGH: "high",
	URGENT: "urgent",
};
export const MessageVisibility = {
	PUBLIC: "public",
	PRIVATE: "private",
};
export const ConversationEventType = {
	ASSIGNED: "assigned",
	UNASSIGNED: "unassigned",
	PARTICIPANT_REQUESTED: "participant_requested",
	PARTICIPANT_JOINED: "participant_joined",
	PARTICIPANT_LEFT: "participant_left",
	STATUS_CHANGED: "status_changed",
	PRIORITY_CHANGED: "priority_changed",
	TAG_ADDED: "tag_added",
	TAG_REMOVED: "tag_removed",
	RESOLVED: "resolved",
	REOPENED: "reopened",
};
export const ConversationParticipationStatus = {
	REQUESTED: "requested",
	ACTIVE: "active",
	LEFT: "left",
	DECLINED: "declined",
};
export const ConversationSentiment = {
	POSITIVE: "positive",
	NEGATIVE: "negative",
	NEUTRAL: "neutral",
};
export const WebsiteInstallationTarget = {
	NEXTJS: "nextjs",
	REACT: "react",
};
export const WebsiteStatus = {
	ACTIVE: "active",
	INACTIVE: "inactive",
};
export const APIKeyType = {
	PRIVATE: "private",
	PUBLIC: "public",
};
