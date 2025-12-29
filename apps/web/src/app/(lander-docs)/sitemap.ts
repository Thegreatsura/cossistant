import type { MetadataRoute } from "next";
import { BASE_URL } from "@/constants";
import { blog, changelog, source } from "@/lib/source";

export const revalidate = false;

function getAllBlogTags(): string[] {
	const posts = blog.getPages().filter((post) => post.data.published !== false);
	const tags = new Set<string>();
	for (const post of posts) {
		for (const tag of post.data.tags) {
			tags.add(tag);
		}
	}
	return Array.from(tags);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const url = (path: string): string => new URL(path, BASE_URL).toString();

	const blogPosts = blog
		.getPages()
		.filter((post) => post.data.published !== false);
	const blogTags = getAllBlogTags();

	return [
		{
			url: url("/"),
			changeFrequency: "monthly",
			priority: 1,
		},
		{
			url: url("/docs"),
			changeFrequency: "monthly",
			priority: 0.8,
		},
		{
			url: url("/pricing"),
			changeFrequency: "monthly",
			priority: 0.9,
		},
		{
			url: url("/blog"),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: url("/changelog"),
			changeFrequency: "weekly",
			priority: 0.7,
		},
		// Blog articles - high priority for SEO
		...blogPosts.map((post) => ({
			url: url(post.url),
			lastModified: post.data.date ? new Date(post.data.date) : undefined,
			changeFrequency: "monthly" as const,
			priority: 0.7,
		})),
		// Blog tag pages - medium priority for category discovery
		...blogTags.map((tag) => ({
			url: url(`/blog/tag/${encodeURIComponent(tag)}`),
			changeFrequency: "weekly" as const,
			priority: 0.5,
		})),
		// Changelog entries
		...changelog.getPages().map((page) => ({
			url: url(page.url),
			lastModified: page.data.date ? new Date(page.data.date) : undefined,
			changeFrequency: "monthly" as const,
			priority: 0.4,
		})),
		// Documentation pages
		...source
			.getPages()
			.flatMap((page: ReturnType<typeof source.getPages>[number]) => {
				if ((page.data as { type?: string }).type === "openapi") {
					return [];
				}

				const { lastModified } = page.data as { lastModified?: string };

				return {
					url: url(page.url),
					lastModified: lastModified ? new Date(lastModified) : undefined,
					changeFrequency: "weekly",
					priority: 0.5,
				} as MetadataRoute.Sitemap[number];
			}),
	];
}
