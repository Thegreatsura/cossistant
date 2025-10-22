import {
	defineCollections,
	defineConfig,
	defineDocs,
} from "fumadocs-mdx/config";
import rehypePrettyCode from "rehype-pretty-code";
import { z } from "zod";

import { transformers } from "@/lib/highlight-code";

export default defineConfig({
	mdxOptions: {
		rehypePlugins: (plugins) => {
			plugins.shift();
			plugins.push([
				rehypePrettyCode,
				{
					theme: {
						dark: "github-dark",
						light: "github-light-default",
					},
					transformers,
				},
			]);

			return plugins;
		},
	},
});

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
});

export const blog = defineCollections({
	type: "doc",
	dir: "./content/blog",
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.string(),
		author: z.string(),
		tags: z.array(z.string()),
		image: z.string().optional(),
		published: z.boolean().optional(),
		canonical: z.string().optional(),
	}),
});

export const changelog = defineCollections({
	type: "doc",
	dir: "./content/changelog",
	schema: z.object({
		version: z.string(),
		description: z.string(),
		date: z.string(),
		author: z.string(),
	}),
});
