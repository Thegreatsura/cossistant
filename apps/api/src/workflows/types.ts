export const WORKFLOW = {
        MEMBER_SENT_MESSAGE: "message/member-sent-message",
        VISITOR_SENT_MESSAGE: "message/visitor-sent-message",
} as const;

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
        [WORKFLOW.MEMBER_SENT_MESSAGE]: MemberSentMessageData;
        [WORKFLOW.VISITOR_SENT_MESSAGE]: VisitorSentMessageData;
};
