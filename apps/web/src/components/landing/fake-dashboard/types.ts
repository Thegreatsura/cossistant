export type FakeDashboardView = "inbox" | "conversation";

export type FakeConversationSummary = {
        id: string;
        visitorName: string;
        lastMessagePreview: string;
        lastActiveLabel: string;
        unread?: boolean;
        waitingSinceLabel?: string | null;
        tags?: string[];
};

export type FakeConversationMessage = {
        id: string;
        sender: "visitor" | "agent" | "system";
        name: string;
        timestampLabel: string;
        content: string;
        emphasis?: "highlight" | "subtle";
};

export type FakeVisitorProfile = {
        name: string;
        email?: string;
        country?: string;
        timeZone?: string;
        localTimeLabel?: string;
        plan?: string;
        lastSeenLabel?: string;
};

export type FakeDashboardProps = {
        className?: string;
        initialView?: FakeDashboardView;
        onViewChange?: (view: FakeDashboardView) => void;
        conversations?: FakeConversationSummary[];
        messages?: FakeConversationMessage[];
        visitor?: FakeVisitorProfile;
};
