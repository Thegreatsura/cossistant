/** biome-ignore-all lint/nursery/noUnnecessaryConditions: ok here */
import type { RouterOutputs } from "@api/trpc/types";
import Link from "next/link";
import { useCallback } from "react";
import { useConversationActionRunner } from "@/components/conversation/actions/use-conversation-action-runner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";
import { useVisitorData } from "./hooks";
import { VisitorSidebarPlaceholder } from "./placeholder";
import { CountryFlag } from "./utils";
import { ValueDisplay } from "./value-display";
import { ValueGroup } from "./value-group";
import { VisitorSidebarHeader } from "./visitor-sidebar-header";

export type VisitorSidebarProps = {
	conversationId: string;
	visitorId: string | null;
	visitor: RouterOutputs["conversation"]["getVisitorById"] | null;
	isLoading: boolean;
};

export function VisitorSidebar({
	visitor,
	isLoading,
	conversationId,
	visitorId,
}: VisitorSidebarProps) {
	const visitorData = useVisitorData({ visitor });
	const { unblockVisitor, pendingAction, runAction } =
		useConversationActionRunner({
			conversationId,
			visitorId: visitorId ?? visitor?.id ?? null,
		});

	const handleUnblock = useCallback(() => {
		void runAction(() => unblockVisitor(), {
			successMessage: "Visitor unblocked",
			errorMessage: "Failed to unblock visitor",
		});
	}, [runAction, unblockVisitor]);

	if (isLoading || !visitor || !visitorData) {
		return <VisitorSidebarPlaceholder />;
	}

	const {
		fullName,
		presence,
		countryDetails,
		countryLabel,
		localTime,
		timezoneTooltip,
	} = visitorData;

	const metadata =
		(visitor.contact?.metadata && Object.entries(visitor.contact.metadata)) ||
		[];

	return (
		<ResizableSidebar
			className="hidden lg:flex"
			position="right"
			sidebarTitle="Visitor"
		>
			<SidebarContainer>
				<VisitorSidebarHeader
					avatarUrl={visitor.contact?.image}
					contact={visitor.contact}
					email={visitor.contact?.email}
					fullName={fullName}
					lastSeenAt={presence?.lastSeenAt ?? visitor.lastSeenAt}
					status={presence?.status}
				/>
				<ScrollArea
					className="-mr-1.5 mt-4 flex flex-1 flex-col gap-4 pr-2 pb-32"
					scrollMask
				>
					{visitor.isBlocked ? (
						<Alert className="my-6" variant="destructive">
							<AlertTitle>Visitor blocked</AlertTitle>
							<AlertDescription>
								<div className="flex flex-col gap-3">
									<span>This visitor can't see or send messages.</span>
									<Button
										className="mt-4"
										disabled={pendingAction.unblockVisitor}
										onClick={handleUnblock}
										size="sm"
										type="button"
										variant="destructive"
									>
										{pendingAction.unblockVisitor ? "Unblocking..." : "Unblock"}
									</Button>
								</div>
							</AlertDescription>
						</Alert>
					) : null}
					<ValueGroup>
						<ValueDisplay
							placeholder="Unknown"
							title="Country"
							value={
								countryLabel ? (
									<span className="ml-auto inline-flex items-center gap-2">
										{countryLabel}
										{countryDetails.code ? (
											<CountryFlag countryCode={countryDetails.code} />
										) : null}
									</span>
								) : null
							}
						/>
						<ValueDisplay
							placeholder="Unknown"
							title="Local time"
							tooltip={timezoneTooltip}
							value={
								<>
									{localTime.time}
									<span className="ml-2 text-primary/90">
										({localTime.offset})
									</span>
								</>
							}
						/>
						<ValueDisplay placeholder="Unknown" title="IP" value={visitor.ip} />
					</ValueGroup>
					<ValueGroup>
						{visitor.browser && (
							<ValueDisplay
								title="Browser"
								value={`${visitor.browser} / ${visitor.browserVersion}`}
							/>
						)}
						{visitor.os && (
							<ValueDisplay
								title="OS"
								value={`${visitor.os} / ${visitor.osVersion}`}
							/>
						)}
						{visitor.device && (
							<ValueDisplay
								title="Device"
								value={`${visitor.device} / ${visitor.deviceType}`}
							/>
						)}
						{visitor.viewport && (
							<ValueDisplay
								title="Viewport"
								tooltip={"The viewport is the visitor's browser window size."}
								value={visitor.viewport}
							/>
						)}
					</ValueGroup>
					<ValueGroup header="Metadata">
						{metadata.map(([key, value]) => (
							<ValueDisplay autoFormat key={key} title={key} value={value} />
						))}
						{metadata.length === 0 && (
							<p className="text-primary/60 text-xs">
								No metadata yet, see our{" "}
								<Link
									className="text-primary/60 underline hover:text-primary/80"
									href="/docs/concepts/contacts#contact-metadata"
								>
									documentation
								</Link>{" "}
								to learn more.
							</p>
						)}
					</ValueGroup>
					<div className="h-32" />
				</ScrollArea>
			</SidebarContainer>
		</ResizableSidebar>
	);
}
