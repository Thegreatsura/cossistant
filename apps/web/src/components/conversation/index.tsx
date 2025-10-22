"use client";

import type { ComponentProps } from "react";
import { Page } from "../ui/layout";
import {
        VisitorSidebar,
        type VisitorSidebarProps,
} from "../ui/layout/sidebars/visitor/visitor-sidebar";
import { ConversationHeader, type ConversationHeaderProps } from "./header";
import { ConversationTimelineList } from "./messages/conversation-timeline";
import { MultimodalInput, type MultimodalInputProps } from "./multimodal-input";

type ConversationTimelineProps = ComponentProps<typeof ConversationTimelineList>;

export type ConversationProps = {
        header: ConversationHeaderProps;
        timeline: ConversationTimelineProps;
        input: MultimodalInputProps;
        visitorSidebar: VisitorSidebarProps;
};

export function Conversation({ header, timeline, input, visitorSidebar }: ConversationProps) {
        return (
                <>
                        <Page className="relative py-0 pr-0.5 pl-0">
                                <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-14 bg-gradient-to-b from-co-background/50 to-transparent dark:from-co-background-100/80" />
                                <ConversationHeader {...header} />
                                <ConversationTimelineList {...timeline} />
                                <MultimodalInput {...input} />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-30 bg-gradient-to-t from-co-background to-transparent dark:from-co-background-100/90" />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40 bg-gradient-to-t from-co-background/50 via-co-background to-transparent dark:from-co-background-100/90 dark:via-co-background-100" />
                        </Page>
                        <VisitorSidebar {...visitorSidebar} />
                </>
        );
}
