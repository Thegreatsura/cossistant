import { ComponentPreview } from "@/components/component-preview";
import { cn } from "@/lib/utils";

export const Install = () => (
	<section className="mt-40 flex flex-col gap-6 md:gap-12">
		<div className="flex w-full flex-1 flex-col gap-0 lg:flex-row">
			<div
				className={cn(
					"relative flex flex-1 flex-col gap-2 overflow-hidden border-primary/10 border-dashed p-4 pt-20 sm:pt-16",
					"lg:col-span-3"
				)}
			>
				<h2 className="w-full max-w-3xl text-pretty font-f37-stout text-4xl sm:text-3xl md:text-balance md:text-4xl">
					A beautiful and customizable support widget for your React app.
				</h2>
			</div>
			<div className="flex-1">
				<ComponentPreview
					name="support"
					sizeClasses="min-h-[450px] md:min-h-[666px]"
					withOrnament
				/>
			</div>
		</div>
	</section>
);
