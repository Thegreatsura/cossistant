import type { RouterOutputs } from "@api/trpc/types";
import { resolveCountryDetails } from "@cossistant/location/country-utils";
import { Avatar } from "@/components/ui/avatar";
import { getVisitorNameWithFallback } from "@/lib/visitors";
import { SidebarContainer } from "../container";
import { ResizableSidebar } from "../resizable-sidebar";
import { VisitorSidebarPlaceholder } from "./placeholder";
import { ValueDisplay } from "./value-display";
import { ValueGroup } from "./value-group";

type VisitorSidebarProps = {
        visitor: RouterOutputs["conversation"]["getVisitorById"];
        isLoading: boolean;
};

export function VisitorSidebar({ visitor, isLoading }: VisitorSidebarProps) {
        if (isLoading || !visitor) {
                return <VisitorSidebarPlaceholder />;
        }

        const fullName = getVisitorNameWithFallback(visitor);
        const countryDetails = resolveCountryDetails({
                country: visitor.country,
                countryCode: visitor.countryCode,
                locale: visitor.language,
                timezone: visitor.timezone,
                city: visitor.city,
        });
        const countryLabel = countryDetails.name ?? countryDetails.code;
        const localTime = formatLocalTime(visitor.timezone, visitor.language);
        const timezoneTooltip = visitor.timezone
                ? `Timezone: ${visitor.timezone}`
                : undefined;

        return (
                <ResizableSidebar className="hidden lg:flex" position="right">
                        <SidebarContainer>
                                <div className="flex h-10 w-full items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                                <Avatar
                                                        fallbackName={fullName}
                                                        lastOnlineAt={visitor.lastSeenAt}
                                                        url={visitor.contact?.image}
                                                        withBoringAvatar
                                                />
                                                <div className="flex flex-col gap-0.5">
                                                        <p className="font-medium text-sm">{fullName}</p>
                                                        {visitor.contact ? (
                                                                <p className="text-muted-foreground text-sm">
                                                                        {visitor.contact?.email}
                                                                </p>
                                                        ) : (
                                                                <p className="text-primary/50 text-sm decoration-dashed underline-offset-2">
                                                                        Not identified yet
                                                                </p>
                                                        )}
                                                </div>
                                        </div>
                                </div>
                                <div className="mt-4 flex flex-col gap-4">
                                        <ValueGroup>
                                                <ValueDisplay
                                                        title="Country"
                                                        placeholder="Unknown"
                                                        value={
                                                                countryLabel ? (
                                                                        <span className="ml-auto inline-flex items-center gap-2">
                                                                                {countryLabel}
                                                                                {countryDetails.flagEmoji ? (
                                                                                        <span className="flex h-3.5 w-4.5 items-center justify-center overflow-clip rounded-sm text-2xl">
                                                                                                {countryDetails.flagEmoji}
                                                                                        </span>
                                                                                ) : null}
                                                                        </span>
                                                                ) : null
                                                        }
                                                />
                                                <ValueDisplay
                                                        title="Local time"
                                                        placeholder="Unknown"
                                                        tooltip={timezoneTooltip}
                                                        value={localTime}
                                                />
                                                {visitor.timezone && (
                                                        <ValueDisplay title="Timezone" value={visitor.timezone} />
                                                )}
                                                <ValueDisplay
                                                        placeholder="Unknown"
                                                        title="IP"
                                                        value={visitor.ip}
                                                />
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
                                </div>
                        </SidebarContainer>
                </ResizableSidebar>
        );
}

function formatLocalTime(
        timezone: string | null | undefined,
        locale: string | null | undefined
): string | null {
        if (!timezone) {
                return null;
        }

        const now = new Date();
        let hour12: boolean | undefined;

        if (locale) {
                try {
                        const { hourCycle } = new Intl.DateTimeFormat(locale).resolvedOptions();
                        if (hourCycle === "h11" || hourCycle === "h12") {
                                hour12 = true;
                        } else if (hourCycle === "h23" || hourCycle === "h24") {
                                hour12 = false;
                        }
                } catch (_error) {
                        // Ignore locale resolution failures and fall back to default formatting
                }
        }

        const options: Intl.DateTimeFormatOptions = {
                hour: "numeric",
                minute: "2-digit",
                timeZone: timezone,
        };

        if (hour12 !== undefined) {
                options.hour12 = hour12;
        }

        try {
                return new Intl.DateTimeFormat(locale ?? undefined, options).format(now);
        } catch (_error) {
                try {
                        return new Intl.DateTimeFormat(undefined, options).format(now);
                } catch (_secondaryError) {
                        return null;
                }
        }
}
