import { describe, expect, it } from "bun:test";
import React from "react";
import {
	DefaultMessage,
	extractDefaultMessagesFromChildren,
	resolveSupportConfigMessages,
} from "./support-config";

describe("extractDefaultMessagesFromChildren", () => {
	it("extracts a single message", () => {
		const children = React.createElement(DefaultMessage, {
			content: "Hello there",
			senderType: "team_member",
		});

		expect(extractDefaultMessagesFromChildren(children)).toEqual([
			{
				content: "Hello there",
				senderType: "team_member",
			},
		]);
	});

	it("extracts multiple messages and ignores noise", () => {
		const children = React.createElement(
			React.Fragment,
			null,
			React.createElement(DefaultMessage, {
				content: "Welcome",
				senderType: "team_member",
			}),
			React.createElement("div", null, "ignore"),
			React.createElement(
				React.Fragment,
				null,
				React.createElement(DefaultMessage, {
					content: "Ask me anything",
					senderType: "ai",
					senderId: "agent_1",
				})
			)
		);

		expect(extractDefaultMessagesFromChildren(children)).toEqual([
			{
				content: "Welcome",
				senderType: "team_member",
			},
			{
				content: "Ask me anything",
				senderId: "agent_1",
				senderType: "ai",
			},
		]);
	});
});

describe("resolveSupportConfigMessages", () => {
	it("returns child messages when defaultMessages prop is not provided", () => {
		const children = React.createElement(DefaultMessage, {
			content: "Hi",
			senderType: "team_member",
		});

		expect(resolveSupportConfigMessages({ children })).toEqual([
			{
				content: "Hi",
				senderType: "team_member",
			},
		]);
	});

	it("gives precedence to defaultMessages prop", () => {
		const defaultMessages = [
			{
				content: "From prop",
				senderType: "team_member" as const,
			},
		];

		const children = React.createElement(DefaultMessage, {
			content: "From child",
			senderType: "ai",
		});

		expect(
			resolveSupportConfigMessages({
				children,
				defaultMessages,
			})
		).toEqual(defaultMessages);
	});

	it("returns undefined when there is no config", () => {
		expect(resolveSupportConfigMessages({})).toBeUndefined();
	});
});
