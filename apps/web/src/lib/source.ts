import { loader, multiple } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx/runtime/next";
import { openapiPlugin, openapiSource } from "fumadocs-openapi/server";
import {
	blog as blogPosts,
	changelog as changelogPosts,
	docs,
} from "@/docs-source/index";
import { openapi } from "@/lib/openapi";

export const source = loader(
	multiple({
		docs: docs.toFumadocsSource(),
		openapi: await openapiSource(openapi, {
			baseDir: "openapi/(generated)",
		}),
	}),
	{
		baseUrl: "/docs",
		plugins: [openapiPlugin()],
	}
);

export const blog = loader(createMDXSource(blogPosts), {
	baseUrl: "/blog",
});

export const changelog = loader(createMDXSource(changelogPosts), {
	baseUrl: "/changelog",
});
