import { useCallback, useMemo, useState, type FormEventHandler } from "react";
import { ConversationEventType, ConversationTimelineType, TimelineItemVisibility } from "@cossistant/types/enums";
import type { SendTimelineItemRequest } from "@cossistant/types/api/timeline-item";

import { useVisitor } from "../../hooks/use-visitor";
import { useSupport } from "../../provider";
import { Button } from "./button";
import type { ConversationTimelineToolProps } from "./conversation-timeline";
import { useSupportText } from "../text";

export const IdentificationTimelineTool: React.FC<ConversationTimelineToolProps> = ({
        conversationId,
}) => {
        const text = useSupportText();
        const { identify, visitor } = useVisitor();
        const { client } = useSupport();
        const [email, setEmail] = useState("");
        const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
        const [errorMessage, setErrorMessage] = useState<string | null>(null);

        const isAlreadyIdentified = Boolean(visitor?.contact);
        const hasSucceeded = status === "success" || isAlreadyIdentified;

        const ctaLabel = text("component.identificationTool.cta");
        const successLabel = text("component.identificationTool.success");
        const description = text("component.identificationTool.description");
        const title = text("component.identificationTool.title");

        const submitDisabled = hasSucceeded || status === "submitting";

        const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(async (event) => {
                event.preventDefault();

                if (submitDisabled) {
                        return;
                }

                const trimmedEmail = email.trim();
                if (!trimmedEmail) {
                        setErrorMessage(text("component.identificationTool.validation"));
                        return;
                }

                setStatus("submitting");
                setErrorMessage(null);

                const identifyResult = await identify({ email: trimmedEmail });

                if (!identifyResult) {
                        setStatus("error");
                        setErrorMessage(text("component.identificationTool.error"));
                        return;
                }

                try {
                        const payload: SendTimelineItemRequest = {
                                conversationId,
                                item: {
                                        type: ConversationTimelineType.EVENT,
                                        text: text("component.identificationTool.eventLog"),
                                        tool: null,
                                        parts: [
                                                {
                                                        type: "event" as const,
                                                        eventType: ConversationEventType.VISITOR_IDENTIFIED,
                                                        actorUserId: null,
                                                        actorAiAgentId: null,
                                                        targetUserId: null,
                                                        targetAiAgentId: null,
                                                        message: text("component.identificationTool.eventLog"),
                                                },
                                        ],
                                        visitorId: identifyResult.visitorId,
                                        visibility: TimelineItemVisibility.PUBLIC,
                                },
                                createIfPending: false,
                        };

                        await client.sendMessage(payload);
                } catch (error) {
                        console.error("Failed to create visitor_identified event", error);
                }

                setStatus("success");
                setEmail("");

                void client
                        .fetchWebsite({ force: true })
                        .catch(() => {});
        }, [
                conversationId,
                email,
                identify,
                client,
                submitDisabled,
                text,
        ]);

        const helperMessage = useMemo(() => {
                if (errorMessage) {
                        return (
                                <p className="text-destructive text-xs" role="alert">
                                        {errorMessage}
                                </p>
                        );
                }

                if (hasSucceeded) {
                        return (
                                <p className="text-primary text-xs">{successLabel}</p>
                        );
                }

                return null;
        }, [errorMessage, hasSucceeded, successLabel]);

        return (
                <div className="rounded-lg border border-co-border/60 bg-co-background-0 p-4 shadow-sm">
                        <div className="flex flex-col gap-3">
                                <div className="flex flex-col gap-1">
                                        <h3 className="font-semibold text-sm">{title}</h3>
                                        <p className="text-muted-foreground text-xs">{description}</p>
                                </div>
                                {hasSucceeded ? (
                                        <div className="rounded-md bg-co-primary/10 px-3 py-2 text-sm text-primary">
                                                {successLabel}
                                        </div>
                                ) : (
                                        <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
                                                <input
                                                        aria-label={text(
                                                                "component.identificationTool.inputLabel"
                                                        )}
                                                        autoComplete="email"
                                                        className="w-full rounded-md border border-co-border/60 bg-transparent px-3 py-2 text-sm outline-none focus:border-co-primary focus:ring-2 focus:ring-co-primary/20"
                                                        disabled={submitDisabled}
                                                        inputMode="email"
                                                        onChange={(event) => setEmail(event.target.value)}
                                                        placeholder={text(
                                                                "component.identificationTool.inputPlaceholder"
                                                        )}
                                                        type="email"
                                                        value={email}
                                                />
                                                {helperMessage}
                                                <Button className="w-full" disabled={submitDisabled} type="submit">
                                                        {status === "submitting"
                                                                ? text("component.identificationTool.loading")
                                                                : ctaLabel}
                                                </Button>
                                        </form>
                                )}
                        </div>
                </div>
        );
};

IdentificationTimelineTool.displayName = "IdentificationTimelineTool";
