"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useHotkeys } from "react-hotkeys-hook";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "@/components/ui/icons";
import { authClient, signOut } from "@/lib/auth/client";

type UserDropdownProps = {
  websiteSlug: string;
};

export function UserDropdown({ websiteSlug }: UserDropdownProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { setTheme, resolvedTheme } = useTheme();

  const user = session?.user ?? null;
  const userEmail = user?.email ?? "";
  const userDisplayName = user?.name ?? userEmail ?? "You";
  const userAvatarUrl = user?.image ?? null;

  useHotkeys(
    ["m"],
    (_, handler) => {
      switch (handler.keys?.join("")) {
        case "m":
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          break;
        default:
          break;
      }
    },
    {
      preventDefault: true,
      enableOnContentEditable: false,
      enableOnFormTags: false,
    }
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group flex items-center gap-2.5 rounded p-3 text-left text-primary/80 text-sm hover:cursor-pointer hover:bg-background-200 hover:text-primary disabled:opacity-50 dark:hover:bg-background-300"
          disabled={!user}
          type="button"
        >
          <Avatar
            className="size-5"
            fallbackName={userDisplayName}
            url={userAvatarUrl}
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate">{userDisplayName}</span>
          </div>
          <Icon
            className="opacity-20 group-hover:opacity-90"
            name="more"
            variant="filled"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        side="top"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => router.push(`/${websiteSlug}/help`)}
          >
            <Icon className="mx-1 size-4" filledOnHover name="help" />
            Help
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/docs")}>
            <Icon className="mx-1 size-4" filledOnHover name="docs" />
            Docs
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push(`/${websiteSlug}/billing`)}
          >
            <Icon className="mx-1 size-4" filledOnHover name="card" />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => router.push(`/${websiteSlug}/settings`)}
          >
            <Icon className="mx-1 size-4" filledOnHover name="settings" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setTheme(resolvedTheme === "dark" ? "light" : "dark");
          }}
          shortcuts={["M"]}
        >
          <Icon
            className="mx-1 size-4"
            filledOnHover
            name={resolvedTheme === "dark" ? "sun" : "moon"}
          />
          Toggle theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            router.replace("/");
          }}
        >
          <Icon className="mx-1 size-4" filledOnHover name="logout" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserDropdown;
