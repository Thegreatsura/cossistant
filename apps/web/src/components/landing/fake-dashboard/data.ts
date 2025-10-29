import type { RouterOutputs } from "@api/trpc/types";
import type { ConversationHeader } from "@cossistant/types";

export type FakeVisitor = RouterOutputs["conversation"]["getVisitorById"];

export type FakeTypingVisitor = {
	conversationId: string;
	visitorId: string;
	preview: string | null;
};

// Fake data for landing page demo
const now = new Date();
const daysAgo = (days: number, hours = 0) => {
	const date = new Date(now);
	date.setDate(date.getDate() - days);
	date.setHours(date.getHours() - hours);
	return date.toISOString();
};

const minutesAgo = (minutes: number) => {
	const date = new Date(now);
	date.setMinutes(date.getMinutes() - minutes);
	return date.toISOString();
};

// Helper to create a full visitor object with metadata
const createFakeVisitor = (partial: {
	id: string;
	lastSeenAt: string;
	contact?: {
		id: string;
		name: string | null;
		email: string | null;
		image: string | null;
	};
	browser?: string;
	browserVersion?: string;
	os?: string;
	osVersion?: string;
	device?: string;
	deviceType?: string;
	country?: string;
	countryCode?: string;
	city?: string;
	region?: string;
	timezone?: string;
	language?: string;
	ip?: string;
	viewport?: string;
}): FakeVisitor =>
	({
		id: partial.id,
		browser: partial.browser ?? null,
		browserVersion: partial.browserVersion ?? null,
		os: partial.os ?? null,
		osVersion: partial.osVersion ?? null,
		device: partial.device ?? null,
		deviceType: partial.deviceType ?? null,
		ip: partial.ip ?? null,
		city: partial.city ?? null,
		region: partial.region ?? null,
		country: partial.country ?? null,
		countryCode: partial.countryCode ?? null,
		latitude: null,
		longitude: null,
		language: partial.language ?? null,
		timezone: partial.timezone ?? null,
		screenResolution: null,
		viewport: partial.viewport ?? null,
		createdAt: daysAgo(30),
		updatedAt: now.toISOString(),
		lastSeenAt: partial.lastSeenAt,
		websiteId: "01JGWEB11111111111111111",
		organizationId: "01JGORG11111111111111111",
		blockedAt: null,
		blockedByUserId: null,
		isBlocked: false,
		contact: partial.contact ?? null,
		userId: null,
		isTest: false,
		deletedAt: null,
	}) as FakeVisitor;

const fakeVisitors: FakeVisitor[] = [];

const fakeConversations: ConversationHeader[] = [
	{
		id: "01JGAA1111111111111111111",
		status: "open",
		priority: "normal",
		organizationId: "01JGORG11111111111111111",
		visitorId: "01JGVIS11111111111111111",
		visitor: createFakeVisitor({
			id: "01JGVIS11111111111111111",
			lastSeenAt: minutesAgo(2),
			contact: {
				id: "01JGCON11111111111111111",
				name: "Pieter Levels",
				email: "pieter@nomadlist.com",
				image: null,
			},
			browser: "Chrome",
			browserVersion: "120.0",
			os: "macOS",
			osVersion: "14.2",
			device: "MacBook Pro",
			deviceType: "desktop",
			country: "Thailand",
			countryCode: "TH",
			city: "Chiang Mai",
			region: "Chiang Mai Province",
			timezone: "Asia/Bangkok",
			language: "en-US",
			ip: "123.45.67.89",
			viewport: "1920x1080",
		}) as ConversationHeader["visitor"],
		websiteId: "01JGWEB11111111111111111",
		channel: "widget",
		title: "Billing question about annual plan",
		resolutionTime: null,
		startedAt: daysAgo(0, 3),
		firstResponseAt: daysAgo(0, 2),
		resolvedAt: null,
		resolvedByUserId: null,
		resolvedByAiAgentId: null,
		createdAt: daysAgo(0, 3),
		updatedAt: daysAgo(0, 3),
		deletedAt: null,
		lastMessageAt: daysAgo(0, 3),
		lastSeenAt: null,
		lastTimelineItem: {
			id: "01JGTIM11111111111111111",
			conversationId: "01JGAA1111111111111111111",
			organizationId: "01JGORG11111111111111111",
			visibility: "public",
			type: "message",
			text: "Can I upgrade to the annual plan and get the discount applied retroactively?",
			parts: [
				{
					type: "text",
					text: "Can I upgrade to the annual plan and get the discount applied retroactively?",
				},
			],
			userId: null,
			visitorId: "01JGVIS11111111111111111",
			aiAgentId: null,
			createdAt: daysAgo(0, 3),
			deletedAt: null,
		},
		viewIds: [],
		seenData: [],
	},
	{
		id: "01JGAA3333333333333333333",
		status: "resolved",
		priority: "normal",
		organizationId: "01JGORG11111111111111111",
		visitorId: "01JGVIS33333333333333333",
		visitor: createFakeVisitor({
			id: "01JGVIS33333333333333333",
			lastSeenAt: minutesAgo(45),
			contact: {
				id: "01JGCON33333333333333333",
				name: "Tony Dinh",
				email: "tony@blackmagic.so",
				image: null,
			},
			browser: "Safari",
			browserVersion: "17.2",
			os: "macOS",
			osVersion: "14.1",
			device: "MacBook Air",
			deviceType: "desktop",
			country: "Vietnam",
			countryCode: "VN",
			city: "Ho Chi Minh City",
			region: "Ho Chi Minh",
			timezone: "Asia/Ho_Chi_Minh",
			language: "en-US",
			ip: "98.76.54.32",
			viewport: "1440x900",
		}) as ConversationHeader["visitor"],
		websiteId: "01JGWEB11111111111111111",
		channel: "widget",
		title: "How to customize widget colors?",
		resolutionTime: 3_600_000,
		startedAt: daysAgo(2, 5),
		firstResponseAt: daysAgo(2, 4),
		resolvedAt: daysAgo(2, 1),
		resolvedByUserId: "01JGUSER1111111111111111",
		resolvedByAiAgentId: null,
		createdAt: daysAgo(2, 5),
		updatedAt: daysAgo(2, 1),
		deletedAt: null,
		lastMessageAt: daysAgo(2, 1),
		lastSeenAt: null,
		lastTimelineItem: {
			id: "01JGTIM33333333333333333",
			conversationId: "01JGAA3333333333333333333",
			organizationId: "01JGORG11111111111111111",
			visibility: "public",
			type: "message",
			text: "Perfect! Exactly what I needed. Thanks!",
			parts: [
				{ type: "text", text: "Perfect! Exactly what I needed. Thanks!" },
			],
			userId: null,
			visitorId: "01JGVIS33333333333333333",
			aiAgentId: null,
			createdAt: daysAgo(2, 1),
			deletedAt: null,
		},
		viewIds: [],
		seenData: [],
	},
	{
		id: "01JGAA4444444444444444444",
		status: "open",
		priority: "urgent",
		organizationId: "01JGORG11111111111111111",
		visitorId: "01JGVIS44444444444444444",
		visitor: createFakeVisitor({
			id: "01JGVIS44444444444444444",
			lastSeenAt: now.toISOString(),
			contact: {
				id: "01JGCON44444444444444444",
				name: "Nico Jeannen",
				email: "nico@indie.page",
				image: null,
			},
			browser: "Firefox",
			browserVersion: "121.0",
			os: "Windows",
			osVersion: "11",
			device: "Desktop PC",
			deviceType: "desktop",
			country: "France",
			countryCode: "FR",
			city: "Paris",
			region: "Île-de-France",
			timezone: "Europe/Paris",
			language: "fr-FR",
			ip: "185.23.45.67",
			viewport: "2560x1440",
		}) as ConversationHeader["visitor"],
		websiteId: "01JGWEB11111111111111111",
		channel: "widget",
		title: "Can't access dashboard after payment",
		resolutionTime: null,
		startedAt: daysAgo(0, 12),
		firstResponseAt: null,
		resolvedAt: null,
		resolvedByUserId: null,
		resolvedByAiAgentId: null,
		createdAt: daysAgo(0, 12),
		updatedAt: daysAgo(0, 12),
		deletedAt: null,
		lastMessageAt: daysAgo(0, 12),
		lastSeenAt: null,
		lastTimelineItem: {
			id: "01JGTIM44444444444444444",
			conversationId: "01JGAA4444444444444444444",
			organizationId: "01JGORG11111111111111111",
			visibility: "public",
			type: "message",
			text: "I just paid for the annual plan but still see the free tier in my dashboard. Help!",
			parts: [
				{
					type: "text",
					text: "I just paid for the annual plan but still see the free tier in my dashboard. Help!",
				},
			],
			userId: null,
			visitorId: "01JGVIS44444444444444444",
			aiAgentId: null,
			createdAt: daysAgo(0, 12),
			deletedAt: null,
		},
		viewIds: [],
		seenData: [],
	},
	{
		id: "01JGAA5555555555555555555",
		status: "open",
		priority: "normal",
		organizationId: "01JGORG11111111111111111",
		visitorId: "01JGVIS55555555555555555",
		visitor: createFakeVisitor({
			id: "01JGVIS55555555555555555",
			lastSeenAt: minutesAgo(120),
			contact: {
				id: "01JGCON55555555555555555",
				name: "Danny Postma",
				email: "danny@landingfolio.com",
				image: null,
			},
			browser: "Chrome",
			browserVersion: "120.0",
			os: "macOS",
			osVersion: "14.3",
			device: "iMac",
			deviceType: "desktop",
			country: "Netherlands",
			countryCode: "NL",
			city: "Amsterdam",
			region: "North Holland",
			timezone: "Europe/Amsterdam",
			language: "nl-NL",
			ip: "84.124.78.90",
			viewport: "2560x1440",
		}) as ConversationHeader["visitor"],
		websiteId: "01JGWEB11111111111111111",
		channel: "widget",
		title: "Feature request: Dark mode support",
		resolutionTime: null,
		startedAt: daysAgo(1, 8),
		firstResponseAt: daysAgo(1, 7),
		resolvedAt: null,
		resolvedByUserId: null,
		resolvedByAiAgentId: null,
		createdAt: daysAgo(1, 8),
		updatedAt: daysAgo(1, 6),
		deletedAt: null,
		lastMessageAt: daysAgo(1, 6),
		lastSeenAt: null,
		lastTimelineItem: {
			id: "01JGTIM55555555555555555",
			conversationId: "01JGAA5555555555555555555",
			organizationId: "01JGORG11111111111111111",
			visibility: "public",
			type: "message",
			text: "We're adding dark mode support in the next release! I'll update you when it's ready.",
			parts: [
				{
					type: "text",
					text: "We're adding dark mode support in the next release! I'll update you when it's ready.",
				},
			],
			userId: "01JGUSER1111111111111111",
			visitorId: null,
			aiAgentId: null,
			createdAt: daysAgo(1, 6),
			deletedAt: null,
		},
		viewIds: [],
		seenData: [],
	},
	{
		id: "01JGAA6666666666666666666",
		status: "resolved",
		priority: "low",
		organizationId: "01JGORG11111111111111111",
		visitorId: "01JGVIS66666666666666666",
		visitor: createFakeVisitor({
			id: "01JGVIS66666666666666666",
			lastSeenAt: daysAgo(1),
			contact: {
				id: "01JGCON66666666666666666",
				name: "Damon Chen",
				email: "damon@testdriver.ai",
				image: null,
			},
			browser: "Edge",
			browserVersion: "120.0",
			os: "Windows",
			osVersion: "11",
			device: "Surface Laptop",
			deviceType: "desktop",
			country: "United States",
			countryCode: "US",
			city: "San Francisco",
			region: "California",
			timezone: "America/Los_Angeles",
			language: "en-US",
			ip: "172.58.23.45",
			viewport: "1920x1080",
		}) as ConversationHeader["visitor"],
		websiteId: "01JGWEB11111111111111111",
		channel: "widget",
		title: "Documentation for React integration",
		resolutionTime: 7_200_000,
		startedAt: daysAgo(3, 5),
		firstResponseAt: daysAgo(3, 4),
		resolvedAt: daysAgo(3, 2),
		resolvedByUserId: "01JGUSER1111111111111111",
		resolvedByAiAgentId: null,
		createdAt: daysAgo(3, 5),
		updatedAt: daysAgo(3, 2),
		deletedAt: null,
		lastMessageAt: daysAgo(3, 2),
		lastSeenAt: null,
		lastTimelineItem: {
			id: "01JGTIM66666666666666666",
			conversationId: "01JGAA6666666666666666666",
			organizationId: "01JGORG11111111111111111",
			visibility: "public",
			type: "message",
			text: "Got it working, thank you!",
			parts: [{ type: "text", text: "Got it working, thank you!" }],
			userId: null,
			visitorId: "01JGVIS66666666666666666",
			aiAgentId: null,
			createdAt: daysAgo(3, 2),
			deletedAt: null,
		},
		viewIds: [],
		seenData: [],
	},
];

export const marcVisitor: FakeVisitor = createFakeVisitor({
	id: "01JGVIS22222222222222222",
	lastSeenAt: new Date().toISOString(),
	contact: {
		id: "01JGCON22222222222222222",
		name: "Marc Louvion",
		email: "marc@shipfa.st",
		image: null,
	},
	browser: "Chrome",
	browserVersion: "120.0",
	os: "macOS",
	osVersion: "14.2",
	device: "MacBook Pro",
	deviceType: "desktop",
	country: "France",
	countryCode: "FR",
	city: "Paris",
	region: "Île-de-France",
	timezone: "Europe/Paris",
	language: "fr-FR",
	ip: "185.67.89.12",
	viewport: "1680x1050",
});

// Marc's conversation that will be added dynamically
const createMarcConversation = (
	messageText: string,
	timestamp: Date
): ConversationHeader => ({
	id: "01JGAA2222222222222222222",
	status: "open",
	priority: "high",
	organizationId: "01JGORG11111111111111111",
	visitorId: "01JGVIS22222222222222222",
	visitor: marcVisitor as ConversationHeader["visitor"],
	websiteId: "01JGWEB11111111111111111",
	channel: "widget",
	title: "Widget not loading on production",
	resolutionTime: null,
	startedAt: timestamp.toISOString(),
	firstResponseAt: null,
	resolvedAt: null,
	resolvedByUserId: null,
	resolvedByAiAgentId: null,
	createdAt: timestamp.toISOString(),
	updatedAt: timestamp.toISOString(),
	deletedAt: null,
	lastMessageAt: timestamp.toISOString(),
	lastSeenAt: null,
	lastTimelineItem: {
		id: "01JGTIM22222222222222222",
		conversationId: "01JGAA2222222222222222222",
		organizationId: "01JGORG11111111111111111",
		visibility: "public",
		type: "message",
		text: messageText,
		parts: [
			{
				type: "text",
				text: messageText,
			},
		],
		userId: null,
		visitorId: "01JGVIS22222222222222222",
		aiAgentId: null,
		createdAt: timestamp.toISOString(),
		deletedAt: null,
	},
	viewIds: [],
	seenData: [],
});

export { createMarcConversation, fakeConversations, fakeVisitors };
