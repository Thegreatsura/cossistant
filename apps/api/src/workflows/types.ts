export const WORKFLOW = {
	WAITLIST_JOIN: "waitlist/join",
	WAITLIST_LEAVE: "waitlist/leave",
	MEMBER_SENT_MESSAGE: "message/member-sent",
	VISITOR_SENT_MESSAGE: "message/visitor-sent",
} as const;

// Export data types for use in workflow handlers
export type WaitlistJoinData = {
	userId: string;
	email: string;
	name: string;
};

export type MemberSentMessageData = {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	senderId: string;
};

export type VisitorSentMessageData = {
	conversationId: string;
	messageId: string;
	websiteId: string;
	organizationId: string;
	visitorId: string;
};

export type WorkflowDataMap = {
	[WORKFLOW.WAITLIST_JOIN]: WaitlistJoinData;
	[WORKFLOW.MEMBER_SENT_MESSAGE]: MemberSentMessageData;
	[WORKFLOW.VISITOR_SENT_MESSAGE]: VisitorSentMessageData;
};
