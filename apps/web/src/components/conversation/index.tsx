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

type ConversationTimelineProps = ComponentProps<
	typeof ConversationTimelineList
>;

export type ConversationProps = {
	header: ConversationHeaderProps;
	timeline: ConversationTimelineProps;
	input: MultimodalInputProps;
	visitorSidebar: VisitorSidebarProps;
};

export function Conversation({
	header,
	timeline,
	input,
	visitorSidebar,
}: ConversationProps) {
	return (
		<>
			<Page className="relative py-0 pr-0.5 pl-0">
				<ConversationHeader {...header} />
				<ConversationTimelineList {...timeline} />
				<MultimodalInput {...input} />
			</Page>
			<VisitorSidebar {...visitorSidebar} />
		</>
	);
}
