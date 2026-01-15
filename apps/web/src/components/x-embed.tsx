import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { enrichTweet } from "react-tweet";
import { getTweet } from "react-tweet/api";

type XEmbedProps = {
	id: string;
};

async function TweetContent({ id }: { id: string }) {
	const tweet = await getTweet(id);

	if (!tweet) {
		return null;
	}

	const enriched = enrichTweet(tweet);

	return (
		<Link
			className="group block"
			href={`https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`}
			rel="noopener noreferrer"
			target="_blank"
		>
			<div className="flex gap-3">
				<Image
					alt={tweet.user.name}
					className="size-10 rounded-full"
					height={40}
					src={tweet.user.profile_image_url_https}
					width={40}
				/>
				<div className="min-w-0 flex-1">
					<div className="flex flex-col gap-0.5">
						<span className="font-medium text-sm">{tweet.user.name}</span>
						<span className="text-muted-foreground text-sm">
							@{tweet.user.screen_name}
						</span>
					</div>
				</div>
			</div>
			<p className="mt-10 whitespace-pre-wrap text-pretty text-primary/90">
				{enriched.text}
			</p>
		</Link>
	);
}

export function XEmbed({ id }: XEmbedProps) {
	return (
		<div className="not-prose my-8 rounded border border-primary/10 bg-background p-4 transition-colors hover:bg-background-100">
			<Suspense
				fallback={
					<div className="flex gap-3">
						<div className="size-10 animate-pulse rounded-full bg-background-300" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-32 animate-pulse rounded bg-background-300" />
							<div className="h-4 w-full animate-pulse rounded bg-background-300" />
						</div>
					</div>
				}
			>
				<TweetContent id={id} />
			</Suspense>
		</div>
	);
}
