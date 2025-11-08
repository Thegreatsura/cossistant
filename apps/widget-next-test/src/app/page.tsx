import { Support } from "@cossistant/next";
import { CossistantDemo } from "./demo";

export default function Home() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<CossistantDemo />
			<Support />
		</div>
	);
}
