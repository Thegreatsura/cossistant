import type { InferPageType } from "fumadocs-core/source";
import type { source } from "@/lib/source";

type PageData = {
	type?: string;
	title?: string;
	getText?: (mode: string) => Promise<string>;
};

export async function getLLMText(page: InferPageType<typeof source>) {
	const data = page.data as PageData;
	if (data.type === "openapi") {
		return "";
	}

	const processed = data.getText ? await data.getText("processed") : "";
	return `# ${data.title ?? ""}
URL: ${page.url}
${processed}`;
}
