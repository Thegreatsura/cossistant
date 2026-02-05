import { ConversationStatus } from "@cossistant/types";
import { Text, useSupportText } from "../text";
import { cn } from "../utils";
import Icon from "./icons";

type ConversationResolvedFeedbackProps = {
	status: ConversationStatus | null;
	rating: number | null;
	onRate?: (rating: number) => void;
	isSubmitting?: boolean;
	className?: string;
};

const STAR_COUNT = 5;

export function ConversationResolvedFeedback({
	status,
	rating,
	onRate,
	isSubmitting = false,
	className,
}: ConversationResolvedFeedbackProps) {
	const text = useSupportText();
	const isResolved = status === ConversationStatus.RESOLVED;
	const isRated = rating != null;
	const isInteractive = Boolean(onRate) && !isSubmitting && !isRated;

	if (!isResolved) {
		return (
			<div
				className={cn(
					"m-4 flex items-center justify-center text-balance px-4 pb-6 text-center font-medium text-co-muted-foreground text-sm",
					className
				)}
			>
				<Text as="p" textKey="component.conversationPage.closedMessage" />
			</div>
		);
	}

	return (
		<div
			className={cn(
				"m-4 rounded-md border border-co-border/60 bg-co-background-100 px-4 py-3 text-center text-sm shadow-sm",
				className
			)}
		>
			<Text
				as="p"
				className="font-medium text-co-foreground"
				textKey={
					isRated
						? "component.conversationPage.ratingThanks"
						: "component.conversationPage.ratingPrompt"
				}
			/>
			<div className="mt-2 flex items-center justify-center gap-1">
				{Array.from({ length: STAR_COUNT }).map((_, index) => {
					const value = index + 1;
					const isFilled = rating ? value <= rating : false;

					return (
						<button
							aria-label={text("component.conversationPage.ratingLabel", {
								rating: value,
							})}
							className={cn(
								"group inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
								isInteractive
									? "hover:bg-co-muted"
									: "cursor-default opacity-70"
							)}
							disabled={!isInteractive}
							key={value}
							onClick={() => onRate?.(value)}
							type="button"
						>
							<Icon
								className="h-4 w-4 text-co-primary"
								name="star"
								variant={isFilled ? "filled" : "default"}
							/>
						</button>
					);
				})}
			</div>
			<Text
				as="p"
				className="mt-2 text-co-muted-foreground text-xs"
				textKey="component.conversationPage.closedMessage"
			/>
		</div>
	);
}
