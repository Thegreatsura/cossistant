"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icons";

export type EscalationActionProps = {
	reason: string;
	onJoin: () => void;
	isJoining?: boolean;
};

export const EscalationAction: React.FC<EscalationActionProps> = ({
	reason,
	onJoin,
	isJoining = false,
}) => {
	return (
		<div className="absolute right-0 bottom-4 left-0 z-10 mx-auto w-full bg-background px-4 xl:max-w-xl xl:px-0 2xl:max-w-2xl">
			<div className="flex flex-col gap-3 rounded border border-cossistant-orange/50 border-dashed bg-cossistant-orange/5 p-4">
				{/* Header */}
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded bg-cossistant-orange/20">
						<Icon className="h-4 w-4 text-cossistant-orange" name="agent" />
					</div>
					<div className="font-medium text-sm">Human help requested by AI</div>
				</div>

				{/* Reason */}
				<div className="text-muted-foreground text-sm">Reason: {reason}</div>

				{/* Action */}
				<div className="flex items-center justify-end">
					<Button
						className="bg-cossistant-orange text-white hover:bg-cossistant-orange/90"
						disabled={isJoining}
						onClick={onJoin}
						size="sm"
					>
						{isJoining ? <>Joining...</> : <>Join the conversation</>}
					</Button>
				</div>
			</div>
		</div>
	);
};
