import type { RouterOutputs } from "@api/trpc/types";
import flags from "@cossistant/location/country-flags";
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
  const countryFlag = flags[visitor.countryCode as keyof typeof flags];

  console.log({ visitor });

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
                <p className="text-primary/50 text-xs decoration-dashed underline-offset-2">
                  Not identified yet
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <ValueGroup>
            {visitor.country && (
              <ValueDisplay
                title="Country"
                value={
                  <span className="ml-auto inline-flex items-center gap-2">
                    {visitor.country}
                    <span className="flex h-3.5 w-4.5 items-center justify-center overflow-clip rounded-sm text-2xl">
                      {countryFlag.emoji}
                    </span>
                  </span>
                }
              />
            )}
            {visitor.language && (
              <ValueDisplay title="Language" value={visitor.language} />
            )}
            {visitor.timezone && (
              <ValueDisplay title="Timezone" value={visitor.timezone} />
            )}
            {
              <ValueDisplay
                placeholder="Unknown"
                title="IP"
                value={visitor.ip}
              />
            }
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

            {visitor.screenResolution && (
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
