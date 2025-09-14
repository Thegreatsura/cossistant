import {
	MessageContent,
	MessageTimestamp,
	Message as PrimitiveMessage,
} from "@cossistant/react/primitive/message";
import type { Message as MessageType } from "@cossistant/types";
import type React from "react";
import { cn } from "@/lib/utils";

export interface MessageProps {
	message: MessageType;
	isLast?: boolean;
}

export function Message({ message, isLast = false }: MessageProps) {
	return (
		<PrimitiveMessage message={message}>
			{({ isVisitor, isAI, timestamp }) => (
				<div
					className={cn(
						"flex w-full gap-2",
						isVisitor && "flex-row-reverse",
						!isVisitor && "flex-row",
					)}
				>
					<div
						className={cn(
							"flex w-full flex-1 flex-col gap-1",
							isVisitor && "items-end",
						)}
					>
						<MessageContent
							bodyMd={message.bodyMd}
							className={cn(
								"block md:w-max md:max-w-[420px] max-w-full rounded-lg px-3.5 py-2.5 text-sm",
								{
									"bg-co-background-300 text-foreground dark:bg-co-background-600":
										!isVisitor,
									"bg-primary text-primary-foreground": isVisitor,
									"rounded-br-sm": isLast && isVisitor,
									"rounded-bl-sm": isLast && !isVisitor,
								},
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
