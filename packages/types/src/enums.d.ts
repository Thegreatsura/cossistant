export declare const MessageType: {
    readonly TEXT: "text";
    readonly IMAGE: "image";
    readonly FILE: "file";
};
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export declare const SenderType: {
    readonly VISITOR: "visitor";
    readonly TEAM_MEMBER: "team_member";
    readonly AI: "ai";
};
export type SenderType = (typeof SenderType)[keyof typeof SenderType];
export declare const ConversationStatus: {
    readonly OPEN: "open";
    readonly RESOLVED: "resolved";
    readonly BLOCKED: "blocked";
    readonly PENDING: "pending";
};
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];
export declare const ConversationPriority: {
    readonly LOW: "low";
    readonly NORMAL: "normal";
    readonly HIGH: "high";
    readonly URGENT: "urgent";
};
export declare const MessageVisibility: {
    readonly PUBLIC: "public";
    readonly PRIVATE: "private";
};
export declare const ConversationEventType: {
    readonly ASSIGNED: "assigned";
    readonly UNASSIGNED: "unassigned";
    readonly PARTICIPANT_REQUESTED: "participant_requested";
    readonly PARTICIPANT_JOINED: "participant_joined";
    readonly PARTICIPANT_LEFT: "participant_left";
    readonly STATUS_CHANGED: "status_changed";
    readonly PRIORITY_CHANGED: "priority_changed";
    readonly TAG_ADDED: "tag_added";
    readonly TAG_REMOVED: "tag_removed";
    readonly RESOLVED: "resolved";
    readonly REOPENED: "reopened";
};
export declare const ConversationParticipationStatus: {
    readonly REQUESTED: "requested";
    readonly ACTIVE: "active";
    readonly LEFT: "left";
    readonly DECLINED: "declined";
};
export type ConversationParticipationStatus = (typeof ConversationParticipationStatus)[keyof typeof ConversationParticipationStatus];
export type ConversationEventType = (typeof ConversationEventType)[keyof typeof ConversationEventType];
export type MessageVisibility = (typeof MessageVisibility)[keyof typeof MessageVisibility];
export type ConversationPriority = (typeof ConversationPriority)[keyof typeof ConversationPriority];
export declare const WebsiteInstallationTarget: {
    readonly NEXTJS: "nextjs";
    readonly REACT: "react";
};
export declare const WebsiteStatus: {
    readonly ACTIVE: "active";
    readonly INACTIVE: "inactive";
};
export type WebsiteStatus = (typeof WebsiteStatus)[keyof typeof WebsiteStatus];
export type WebsiteInstallationTarget = (typeof WebsiteInstallationTarget)[keyof typeof WebsiteInstallationTarget];
export declare const APIKeyType: {
    readonly PRIVATE: "private";
    readonly PUBLIC: "public";
};
export type APIKeyType = (typeof APIKeyType)[keyof typeof APIKeyType];
//# sourceMappingURL=enums.d.ts.map