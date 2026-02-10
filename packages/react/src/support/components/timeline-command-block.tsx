import type React from "react";
import {
	TimelineCommandBlock as PrimitiveTimelineCommandBlock,
	type TimelineCommandBlockProps as PrimitiveTimelineCommandBlockProps,
} from "../../primitives/timeline-command-block";
import { CoButton } from "./button";

export type TimelineCommandBlockProps = PrimitiveTimelineCommandBlockProps;

export function TimelineCommandBlock({
	commands,
	className,
}: TimelineCommandBlockProps): React.ReactElement {
	return (
		<PrimitiveTimelineCommandBlock
			className={`mt-1 w-full overflow-hidden rounded border border-co-border bg-co-background-200 ${className ?? ""}`.trim()}
			commands={commands}
		>
			{({
				activeCommand,
				activePackageManager,
				hasCopied,
				onCopy,
				packageManagers,
				setPackageManager,
			}) => (
				<>
					<div className="flex items-center justify-between gap-2 px-2 py-1.5">
						<div className="flex items-center gap-1">
							{packageManagers.map((packageManager) => (
								<CoButton
									key={packageManager}
									onClick={() => setPackageManager(packageManager)}
									size="small"
									type="button"
									variant={
										activePackageManager === packageManager
											? "outline"
											: "ghost"
									}
								>
									{packageManager}
								</CoButton>
							))}
						</div>

						<CoButton
							onClick={() => {
								void onCopy();
							}}
							size="small"
							type="button"
							variant="ghost"
						>
							{hasCopied ? "Copied" : "Copy"}
						</CoButton>
					</div>

					<pre className="no-scrollbar overflow-x-auto p-3 text-xs leading-relaxed">
						<code className="language-bash">{activeCommand}</code>
					</pre>
				</>
			)}
		</PrimitiveTimelineCommandBlock>
	);
}
