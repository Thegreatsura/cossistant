import {
	Body,
	Column,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

const MAX_DISPLAYED_MESSAGES = 3;

import { LOGO_URL, OG_AVATAR_URL } from "../constants";

export default function NewMessageInConversation({
	website = {
		name: "Acme",
		slug: "acme",
		logo: null,
	},
	conversationId = "conv_123",
	messages = [
		{
			text: "You are for sure eligible. We'll most likely make those changes within the next day or two. Stay tuned.",
			createdAt: new Date(Date.now() - 1000 * 60 * 5),
			sender: {
				name: "Brendan Urie",
				image: null,
			},
		},
		{
			text: "You're all set now!",
			createdAt: new Date(),
			sender: {
				name: "Brendan Urie",
				image: null,
			},
		},
	],
	email = "user@example.com",
	totalCount = 2,
}: {
	website: {
		name: string;
		slug: string;
		logo: string | null;
	};
	conversationId: string;
	messages: {
		text: string;
		createdAt: Date;
		sender: {
			name: string;
			image: string | null;
		};
	}[];
	email: string;
	totalCount?: number;
}) {
	// Use totalCount if provided, otherwise fall back to messages.length
	const actualCount = totalCount ?? messages.length;

	return (
		<Html>
			<Head />
			<Preview>New message from {website.name}</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-white font-sans">
					<Container className="mx-auto my-8 max-w-[600px] px-8 py-8">
						<Section className="mt-8">
							{website.logo ? (
								<Img alt={website.name} height="32" src={website.logo} />
							) : (
								<Img alt="Cossistant Logo" height="32" src={LOGO_URL} />
							)}
						</Section>

						<Section className="my-8">
							<Heading className="my-0 font-semibold text-black text-xl">
								{actualCount > 1
									? `${actualCount} new messages`
									: "New message"}
							</Heading>
							<Text className="mt-2 text-[14px] text-neutral-600">
								You have{" "}
								{actualCount > 1
									? `${actualCount} new messages`
									: "a new message"}{" "}
								in your conversation
							</Text>
						</Section>

						<Section className="rounded-xl border border-neutral-200 border-solid p-6">
							{messages.slice(0, MAX_DISPLAYED_MESSAGES).map((message, idx) => (
								<Row className={idx > 0 ? "pt-3" : ""} key={idx}>
									<Column className="align-bottom">
										<Img
											alt={message.sender.name}
											className="rounded-full"
											height="32"
											src={
												message.sender.image ||
												`${OG_AVATAR_URL}${encodeURIComponent(message.sender.name)}`
											}
											width="32"
										/>
									</Column>
									<Column className="w-full pl-2">
										<Text className="my-0 font-medium text-[12px] text-neutral-500">
											<span className="text-neutral-700">
												{message.sender.name}
											</span>
											&nbsp;&nbsp;
											{message.createdAt.toLocaleTimeString("en-US", {
												hour: "numeric",
												minute: "numeric",
											})}
										</Text>
										<Text
											className="my-0 rounded-lg rounded-bl-none bg-neutral-100 px-4 py-2.5 text-neutral-800 text-sm leading-5"
											style={{ whiteSpace: "pre-wrap" }}
										>
											{message.text}
										</Text>
									</Column>
								</Row>
							))}
							{actualCount > MAX_DISPLAYED_MESSAGES && (
								<Text className="mt-4 text-center text-[12px] text-neutral-500">
									+{actualCount - MAX_DISPLAYED_MESSAGES} more{" "}
									{actualCount - MAX_DISPLAYED_MESSAGES === 1
										? "message"
										: "messages"}
								</Text>
							)}
							<Link
								className="mt-4 block rounded-lg bg-neutral-900 px-6 py-3 text-center font-medium text-[13px] text-white no-underline"
								href={`https://app.cossistant.com/${website.slug}/conversations/${conversationId}`}
							>
								View conversation
							</Link>
						</Section>

						<Hr className="mx-0 my-6 w-full border border-neutral-200" />
						<Text className="text-[12px] text-neutral-500 leading-6">
							This email was intended for{" "}
							<span className="text-black">{email}</span>. If you were not
							expecting this email, you can ignore it.
						</Text>
						<Text className="mt-4 text-center text-[11px] text-neutral-400">
							Our support is powered by{" "}
							<Link
								className="text-neutral-500 underline"
								href="https://cossistant.com"
							>
								Cossistant
							</Link>
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
