import type { MetadataRoute } from "next";
import { BASE_URL } from "@/constants";
import { source } from "@/lib/source";

export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const url = (path: string): string => new URL(path, BASE_URL).toString();

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
