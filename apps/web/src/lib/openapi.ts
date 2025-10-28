import { createOpenAPI } from "fumadocs-openapi/server";

export const openapi = createOpenAPI({
	input: ["https://api.cossistant.com/openapi"],

	proxyUrl: "/api/proxy",
	shikiOptions: {
		themes: {
			dark: "github-dark",
			light: "github-light",
		},
	},
});
