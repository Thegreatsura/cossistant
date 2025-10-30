import { ComponentPreview } from "@/components/component-preview";
import { cn } from "@/lib/utils";

export const Install = () => (
	<section className="mt-20 grid gap-6 md:gap-12">
		<h2 className="w-full max-w-6xl text-pretty px-4 font-f37-stout text-4xl sm:text-3xl md:text-balance md:text-4xl">
			A beautiful, easy to install support widget for your React app.
		</h2>
		<div className="isolate grid gap-0 border-primary/10 border-y border-dashed lg:grid-cols-6">
			<div
				className={cn(
					"relative flex flex-col gap-2 overflow-hidden border-primary/10 border-dashed p-4 pt-20 sm:p-8 sm:pt-16",
					"lg:col-span-3"
				)}
			>
				<h3 className="z-10 mt-4 font-semibold text-xl">Install the package</h3>
				<p className="w-full max-w-lg text-balance text-muted-foreground">
					Let's start by adding Cossistant to your NextJS project:
				</p>
			</div>
			<div>
				<ComponentPreview name="demo-landing" />
			</div>
		</div>
	</section>
);
