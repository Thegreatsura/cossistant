import {
	blog as blogPosts,
	changelog as changelogPosts,
	docs,
} from "fumadocs-mdx:collections/server";
import { loader } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
// TODO: Uncomment when OpenAPI docs are needed (requires fumadocs-openapi v10 migration)
// import { openapiPlugin, openapiSource } from "fumadocs-openapi/server";
// import { openapi } from "@/lib/openapi";

export const source = loader(docs.toFumadocsSource(), {
	baseUrl: "/docs",
	// TODO: Uncomment when OpenAPI docs are needed
	// plugins: [openapiPlugin()],
});

// Original OpenAPI-enabled source config:
// export const source = loader(
//   multiple({
//     docs: docs.toFumadocsSource(),
//     openapi: await openapiSource(openapi, {
//       baseDir: "openapi/(generated)",
//     }),
//   }),
//   {
//     baseUrl: "/docs",
//     plugins: [openapiPlugin()],
//   }
// );

export const blog = loader(toFumadocsSource(blogPosts, []), {
	baseUrl: "/blog",
});

export const changelog = loader(toFumadocsSource(changelogPosts, []), {
	baseUrl: "/changelog",
});
