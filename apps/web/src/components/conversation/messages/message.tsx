import {
	MessageContent,
	MessageTimestamp,
	Message as PrimitiveMessage,
} from "@cossistant/next/primitives";
import type { Message as MessageType } from "@cossistant/types";
import type React from "react";
import { cn } from "@/lib/utils";

export type MessageProps = {
	message: MessageType;
	isLast?: boolean;
	isSentByViewer?: boolean;
};

export function Message({
	message,
	isLast = false,
	isSentByViewer = false,
}: MessageProps) {
	return (
		<PrimitiveMessage message={message}>
			{({ isAI, timestamp }) => (
				<div
					className={cn(
						"flex w-full gap-2",
						isSentByViewer && "flex-row-reverse",
						!isSentByViewer && "flex-row"
					)}
				>
					<div
						className={cn(
							"flex w-full flex-1 flex-col gap-3",
							isSentByViewer && "items-end"
						)}
					>
						<MessageContent
							bodyMd={message.bodyMd}
							className={cn(
								"block max-w-full rounded-lg px-3 py-2 text-sm md:w-max md:max-w-[420px]",
								{
									"bg-background-300 text-foreground dark:bg-background-600":
										!isSentByViewer,
									"bg-primary text-primary-foreground": isSentByViewer,
									"rounded-br-[2px]": isLast && isSentByViewer,
									"rounded-bl-[2px]": isLast && !isSentByViewer,
								}
							)}
							renderMarkdown
						/>
						{isLast && (
							<MessageTimestamp
								className="px-1 text-muted-foreground text-xs"
								timestamp={timestamp}
							>
								{() => (
									<>
										{timestamp.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
										{isAI && " • AI agent"}
									</>
								)}
							</MessageTimestamp>
						)}
					</div>
				</div>
			)}
		</PrimitiveMessage>
	);
}
