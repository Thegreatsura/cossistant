import type { MarkdownToken, ParsedMention } from "../types";

/**
 * Simple markdown parser that converts text into tokens for overlay rendering.
 * This is intentionally lightweight - we only need to parse for visual preview,
 * not full markdown compliance.
 */

// Regex patterns
const MENTION_REGEX = /@\[([^\]]+)\]\(mention:([^:]+):([^)]+)\)/;
const BOLD_REGEX = /\*\*(.+?)\*\*/;
const ITALIC_REGEX = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/;
const CODE_INLINE_REGEX = /`([^`]+)`/;
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/;

/**
 * Parse inline markdown into tokens.
 * Handles: bold, italic, inline code, links, mentions
 */
export function parseInline(text: string): MarkdownToken[] {
	const tokens: MarkdownToken[] = [];
	let remaining = text;
	let position = 0;

	while (remaining.length > 0) {
		// Find the earliest match
		let earliestMatch: {
			type: string;
			index: number;
			match: RegExpExecArray;
		} | null = null;

		const patterns = [
			{ type: "mention", regex: new RegExp(MENTION_REGEX.source) },
			{ type: "bold", regex: new RegExp(BOLD_REGEX.source) },
			{ type: "code", regex: new RegExp(CODE_INLINE_REGEX.source) },
			{ type: "link", regex: new RegExp(LINK_REGEX.source) },
			{ type: "italic", regex: new RegExp(ITALIC_REGEX.source) },
		];

		for (const { type, regex } of patterns) {
			const match = regex.exec(remaining);
			if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
				earliestMatch = { type, index: match.index, match };
			}
		}

		if (earliestMatch === null) {
			// No more matches - add remaining as text
			if (remaining.length > 0) {
				tokens.push({ type: "text", content: remaining });
			}
			break;
		}

		// Add text before the match
		if (earliestMatch.index > 0) {
			tokens.push({
				type: "text",
				content: remaining.slice(0, earliestMatch.index),
			});
		}

		// Add the matched token
		const { type, match } = earliestMatch;
		const raw = match[0];

		switch (type) {
			case "mention": {
				const name = match[1] ?? "";
				const mentionType = match[2] ?? "";
				const id = match[3] ?? "";
				const mention: ParsedMention = {
					id,
					name,
					type: mentionType as ParsedMention["type"],
					raw,
					startIndex: position + earliestMatch.index,
					endIndex: position + earliestMatch.index + raw.length,
				};
				tokens.push({ type: "mention", mention });
				break;
			}
			case "bold":
				tokens.push({
					type: "strong",
					children: parseInline(match[1] ?? ""),
				});
				break;
			case "italic":
				tokens.push({
					type: "em",
					children: parseInline(match[1] ?? ""),
				});
				break;
			case "code":
				tokens.push({
					type: "code",
					content: match[1] ?? "",
					inline: true,
				});
				break;
			case "link": {
				const href = match[2] ?? "";
				// Skip mention links (they have mention: prefix)
				if (href.startsWith("mention:")) {
					tokens.push({ type: "text", content: raw });
				} else {
					tokens.push({
						type: "a",
						href,
						children: parseInline(match[1] ?? ""),
					});
				}
				break;
			}
		}

		// Move past the match
		position += earliestMatch.index + raw.length;
		remaining = remaining.slice(earliestMatch.index + raw.length);
	}

	return tokens;
}

/**
 * Parse a line to detect block-level elements.
 */
function parseLine(line: string): MarkdownToken | null {
	// Header
	const headerMatch = line.match(/^(#{1,3})\s+(.*)$/);
	if (headerMatch) {
		const hashPart = headerMatch[1] ?? "";
		const level = Math.min(3, Math.max(1, hashPart.length)) as 1 | 2 | 3;
		return {
			type: "header",
			level,
			children: parseInline(headerMatch[2] ?? ""),
		};
	}

	// Unordered list item
	const bulletMatch = line.match(/^[-*]\s+(.*)$/);
	if (bulletMatch) {
		return {
			type: "li",
			children: parseInline(bulletMatch[1] ?? ""),
		};
	}

	// Ordered list item
	const numberMatch = line.match(/^\d+\.\s+(.*)$/);
	if (numberMatch) {
		return {
			type: "li",
			children: parseInline(numberMatch[1] ?? ""),
		};
	}

	// Blockquote
	const quoteMatch = line.match(/^>\s*(.*)$/);
	if (quoteMatch) {
		return {
			type: "blockquote",
			children: parseInline(quoteMatch[1] ?? ""),
		};
	}

	return null;
}

/**
 * Group consecutive list items into lists.
 */
function groupLists(tokens: MarkdownToken[]): MarkdownToken[] {
	const result: MarkdownToken[] = [];
	let currentList: { type: "ul" | "ol"; items: MarkdownToken[] } | null = null;

	for (const token of tokens) {
		if (token.type === "li") {
			if (!currentList) {
				// Start a new list - detect type from original line (we lose this info, default to ul)
				currentList = { type: "ul", items: [] };
			}
			currentList.items.push(token);
		} else {
			if (currentList) {
				// End current list
				result.push({
					type: currentList.type,
					children: currentList.items,
				});
				currentList = null;
			}
			result.push(token);
		}
	}

	// Don't forget trailing list
	if (currentList) {
		result.push({
			type: currentList.type,
			children: currentList.items,
		});
	}

	return result;
}

/**
 * Parse markdown text into tokens.
 */
export function parseMarkdown(text: string): MarkdownToken[] {
	if (!text) {
		return [];
	}

	const lines = text.split("\n");
	const tokens: MarkdownToken[] = [];

	for (const line of lines) {
		// Empty line = line break
		if (line.trim() === "") {
			tokens.push({ type: "br" });
			continue;
		}

		// Try to parse as block element
		const blockToken = parseLine(line);
		if (blockToken) {
			tokens.push(blockToken);
			continue;
		}

		// Regular paragraph/inline content
		tokens.push({
			type: "p",
			children: parseInline(line),
		});
	}

	// Group list items
	return groupLists(tokens);
}

/**
 * Check if text contains any markdown formatting.
 */
export function hasMarkdownFormatting(text: string): boolean {
	const patterns = [
		/\*\*.+?\*\*/,     // bold
		/\*.+?\*/,         // italic
		/`.+?`/,           // inline code
		/\[.+?\]\(.+?\)/,  // links/mentions
		/^#{1,3}\s/m,      // headers
		/^[-*]\s/m,        // bullet list
		/^\d+\.\s/m,       // numbered list
		/^>\s/m,           // blockquote
	];

	return patterns.some((p) => p.test(text));
}
