import { format } from "date-fns";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AsciiImage } from "@/components/ui/ascii-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";
import { Separator } from "@/components/ui/separator";
import { BASE_URL } from "@/constants";
import { blog } from "@/lib/source";
import { absoluteUrl } from "@/lib/utils";
import { mdxComponents } from "../../components/docs/mdx-components";

export const revalidate = false;
export const dynamic = "force-static";
export const dynamicParams = false;

const DEFAULT_BLOG_IMAGE = "https://cdn.cossistant.com/landing/main-large.jpg";

type BlogPage = ReturnType<typeof blog.getPages>[number];

function getPublishedPosts() {
	return blog
		.getPages()
		.filter((post) => post.data.published !== false)
		.sort(
			(a, b) =>
				new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
		);
}

function getPostBySlug(slug: string): BlogPage | undefined {
	const posts = getPublishedPosts();
	return posts.find((post) => {
		// Check custom slug first, then file slug
		const postSlug = post.data.slug || post.slugs[0];
		return postSlug === slug;
	});
}

export function generateStaticParams() {
	const posts = getPublishedPosts();
	return posts.map((post) => ({
		slug: post.data.slug || post.slugs[0],
	}));
}

export async function generateMetadata(props: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const params = await props.params;
	const post = getPostBySlug(params.slug);

	if (!post) {
		return {};
	}

	const { title, description, image, author, date, canonical, tags } =
		post.data;
	const url = absoluteUrl(post.url);

	return {
		title,
		description,
		authors: [{ name: author }],
		keywords: tags,
		openGraph: {
			title,
			description,
			type: "article",
			url,
			publishedTime: date,
			authors: [author],
			tags,
			images: image
				? [{ url: image, alt: title }]
				: [
						{
							url: `/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`,
						},
					],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: image
				? [{ url: image, alt: title }]
				: [
						{
							url: `/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`,
						},
					],
			creator: "@cossistant",
		},
		alternates: {
			canonical: canonical || url,
		},
	};
}

function generateArticleJsonLd(post: BlogPage) {
	const { title, description, image, author, date, tags } = post.data;

	return {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: title,
		description,
		image: image ? `${BASE_URL}${image}` : undefined,
		author: {
			"@type": "Person",
			name: author,
		},
		publisher: {
			"@type": "Organization",
			name: "Cossistant",
			logo: {
				"@type": "ImageObject",
				url: `${BASE_URL}/logo-email.png`,
			},
		},
		datePublished: date,
		dateModified: date,
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": absoluteUrl(post.url),
		},
		keywords: tags.join(", "),
	};
}

function RelatedArticles({ slugs }: { slugs: string[] }) {
	const posts = getPublishedPosts();
	const relatedPosts = slugs
		.map((slug) => posts.find((p) => (p.data.slug || p.slugs[0]) === slug))
		.filter((p): p is BlogPage => p !== undefined)
		.slice(0, 3);

	if (relatedPosts.length === 0) {
		return null;
	}

	return (
		<section className="mt-16">
			<h2 className="mb-6 font-medium text-xl">Related Articles</h2>
			<div className="grid gap-4 md:grid-cols-3">
				{relatedPosts.map((post) => {
					const date = new Date(post.data.date);
					return (
						<Link
							className="group flex flex-col gap-3 border border-primary/10 border-dashed bg-background-50 p-5 transition-colors hover:bg-background-100 dark:bg-background-100 dark:hover:bg-background-200"
							href={post.url}
							key={post.url}
						>
							<h3 className="line-clamp-2 font-medium tracking-tight transition-colors group-hover:text-primary">
								{post.data.title}
							</h3>
							<p className="line-clamp-2 text-muted-foreground text-sm">
								{post.data.description}
							</p>
							<time
								className="mt-auto font-mono text-muted-foreground text-xs"
								dateTime={post.data.date}
							>
								{format(date, "MMM d, yyyy")}
							</time>
						</Link>
					);
				})}
			</div>
		</section>
	);
}

export default async function BlogPostPage(props: {
	params: Promise<{ slug: string }>;
}) {
	const params = await props.params;
	const post = getPostBySlug(params.slug);

	if (!post) {
		notFound();
	}

	const { title, description, image, author, date, tags, related } = post.data;
	const MDX = post.data.body;
	const formattedDate = format(new Date(date), "MMMM d, yyyy");

	// Find prev/next posts for navigation
	const allPosts = getPublishedPosts();
	const currentIndex = allPosts.indexOf(post);
	const prevPost =
		currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
	const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

	const jsonLd = generateArticleJsonLd(post);

	return (
		<>
			<script
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is safe, controlled server-side content
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(jsonLd),
				}}
				id="article-jsonld"
				type="application/ld+json"
			/>
			<article className="flex flex-col py-20 pb-40">
				<div className="mx-auto w-full max-w-3xl px-4 md:px-0">
					{/* Back link */}
					<Link
						className="mt-10 mb-8 inline-flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
						href="/blog"
					>
						<Icon className="size-4" name="arrow-left" />
						Back to Blog
					</Link>

					{/* Header */}
					<header className="mb-8">
						{/* Tags */}
						<div className="mb-4 flex flex-wrap gap-2">
							{tags.map((tag) => (
								<Badge asChild key={tag} variant="secondary">
									<Link href={`/blog/tag/${encodeURIComponent(tag)}`}>
										{tag}
									</Link>
								</Badge>
							))}
						</div>

						{/* Title */}
						<h1 className="mb-4 text-balance font-medium text-3xl tracking-tight md:text-4xl">
							{title}
						</h1>

						{/* Description */}
						<p className="mb-6 text-lg text-muted-foreground">{description}</p>

						{/* Author & Date */}
						<div className="flex items-center gap-4">
							<div className="flex size-10 items-center justify-center rounded-full bg-background-300 font-medium">
								{author.charAt(0)}
							</div>
							<div className="flex flex-col">
								<span className="font-medium">{author}</span>
								<time className="text-muted-foreground text-sm" dateTime={date}>
									{formattedDate}
								</time>
							</div>
						</div>
					</header>

					{/* Hero Image */}
					<AsciiImage
						alt={title}
						asciiOpacity={0.9}
						className="mb-12 aspect-[16/9] border border-primary/10 border-dashed bg-background-100 grayscale"
						noiseIntensity={1}
						noiseSpeed={1}
						priority
						resolution={0.15}
						src={image || DEFAULT_BLOG_IMAGE}
					/>

					{/* Content */}
					<div className="max-w-none">
						<MDX components={mdxComponents} />
					</div>

					{/* Tags at bottom */}
					<Separator className="my-12 opacity-50" />

					<div className="flex flex-wrap items-center gap-2">
						<span className="text-muted-foreground text-sm">Tagged:</span>
						{tags.map((tag) => (
							<Badge asChild key={tag} variant="outline">
								<Link href={`/blog/tag/${encodeURIComponent(tag)}`}>{tag}</Link>
							</Badge>
						))}
					</div>

					{/* Related Articles */}
					{related && related.length > 0 && <RelatedArticles slugs={related} />}

					{/* Navigation */}
					<Separator className="my-12 opacity-50" />

					<nav className="flex items-center justify-between gap-4">
						{prevPost ? (
							<Button
								asChild
								className="shadow-none"
								size="sm"
								variant="secondary"
							>
								<Link href={prevPost.url}>
									<Icon name="arrow-left" />
									<span className="hidden sm:inline">
										{prevPost.data.title}
									</span>
									<span className="sm:hidden">Previous</span>
								</Link>
							</Button>
						) : (
							<div />
						)}
						{nextPost ? (
							<Button
								asChild
								className="shadow-none"
								size="sm"
								variant="secondary"
							>
								<Link href={nextPost.url}>
									<span className="hidden sm:inline">
										{nextPost.data.title}
									</span>
									<span className="sm:hidden">Next</span>
									<Icon name="arrow-right" />
								</Link>
							</Button>
						) : (
							<div />
						)}
					</nav>
				</div>
			</article>
		</>
	);
}
