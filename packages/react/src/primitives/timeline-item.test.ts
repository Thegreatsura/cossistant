import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TimelineItemContent } from "./timeline-item";

function renderMessageContent(text: string): string {
	return renderToStaticMarkup(
		React.createElement(TimelineItemContent, {
			text,
			renderMarkdown: true,
		})
	);
}

describe("TimelineItemContent", () => {
	it("preserves multiple blank lines for plain text messages", () => {
		const text = "Line 1\n\n\nLine 4";
		const html = renderMessageContent(text);

		expect(html).toContain("whitespace-pre-wrap");
		expect(html).toContain("break-words");
		expect(html).toContain(text);
		expect(html).not.toContain("<br");
	});

	it("preserves a single line break for plain text messages", () => {
		const text = "Line 1\nLine 2";
		const html = renderMessageContent(text);

		expect(html).toContain("whitespace-pre-wrap");
		expect(html).toContain(text);
		expect(html).not.toContain("<br");
	});

	it("still renders markdown formatting and mention links", () => {
		const markdownHtml = renderMessageContent("**bold**");
		expect(markdownHtml).toContain(
			'<strong class="font-semibold">bold</strong>'
		);
		expect(markdownHtml).not.toContain("whitespace-pre-wrap");

		const mentionHtml = renderMessageContent(
			"[@John](mention:human-agent:123)"
		);
		expect(mentionHtml).toContain('data-mention-type="human-agent"');
		expect(mentionHtml).toContain('data-mention-id="123"');
		expect(mentionHtml).toContain("@John");
		expect(mentionHtml).not.toContain("whitespace-pre-wrap");
	});
});
