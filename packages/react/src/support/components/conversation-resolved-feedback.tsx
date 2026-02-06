import { ConversationStatus } from "@cossistant/types";
import { useEffect, useRef, useState } from "react";
import { Text, useSupportText } from "../text";
import { cn } from "../utils";
import Icon from "./icons";

type ConversationResolvedFeedbackProps = {
	status: ConversationStatus | null;
	rating: number | null;
	onRate?: (rating: number, comment?: string) => void;
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

	// Local state for the rating flow
	const [selectedRating, setSelectedRating] = useState<number | null>(null);
	const [hoveredRating, setHoveredRating] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Show the rating that was submitted if available, otherwise use local selection
	const displayRating = hoveredRating ?? (isRated ? rating : selectedRating);
	const showCommentField = selectedRating != null && !isRated && !hasSubmitted;
	const isInteractive =
		Boolean(onRate) && !isSubmitting && !isRated && !hasSubmitted;

	useEffect(() => {
		if (showCommentField) {
			textareaRef.current?.focus();
		}
	}, [showCommentField]);

	const handleRatingSelect = (value: number) => {
		if (!isInteractive) {
			return;
		}
		setSelectedRating(value);
	};

	const handleSubmit = () => {
		if (!(selectedRating && onRate)) {
			return;
		}
		setHasSubmitted(true);
		onRate(selectedRating, comment.trim() || undefined);
	};

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
					isRated || hasSubmitted
						? "component.conversationPage.ratingThanks"
						: "component.conversationPage.ratingPrompt"
				}
			/>
			<div className="mt-2 flex items-center justify-center gap-1">
				{Array.from({ length: STAR_COUNT }).map((_, index) => {
					const value = index + 1;
					const isFilled = displayRating ? value <= displayRating : false;

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
							onClick={() => handleRatingSelect(value)}
							onMouseEnter={() => isInteractive && setHoveredRating(value)}
							onMouseLeave={() => isInteractive && setHoveredRating(null)}
							type="button"
						>
							<Icon
								className={cn(
									"h-4 w-4 transition-transform",
									isFilled ? "text-co-primary" : "text-co-muted-foreground/40",
									isInteractive &&
										hoveredRating &&
										value <= hoveredRating &&
										"scale-110"
								)}
								name="star"
								variant={isFilled ? "filled" : "default"}
							/>
						</button>
					);
				})}
			</div>

			{showCommentField && (
				<div className="mt-3 space-y-2">
					<textarea
						className="w-full resize-none rounded-md border border-co-border bg-co-background px-3 py-2 text-co-foreground text-sm placeholder:text-co-muted-foreground focus:border-co-primary focus:outline-none focus:ring-1 focus:ring-co-primary"
						disabled={isSubmitting}
						onChange={(e) => setComment(e.target.value)}
						placeholder={text("component.conversationPage.commentPlaceholder")}
						ref={textareaRef}
						rows={3}
						value={comment}
					/>
					<button
						className={cn(
							"w-full rounded-md bg-co-primary px-4 py-2 font-medium text-co-primary-foreground text-sm transition-colors",
							isSubmitting
								? "cursor-not-allowed opacity-50"
								: "hover:bg-co-primary/90"
						)}
						disabled={isSubmitting}
						onClick={handleSubmit}
						type="button"
					>
						{text("component.conversationPage.submitFeedback")}
					</button>
				</div>
			)}

			{(isRated || hasSubmitted || !showCommentField) && (
				<Text
					as="p"
					className="mt-2 text-co-muted-foreground text-xs"
					textKey="component.conversationPage.closedMessage"
				/>
			)}
		</div>
	);
}
