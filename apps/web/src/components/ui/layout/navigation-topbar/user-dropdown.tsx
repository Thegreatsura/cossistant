"use client";

import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "@/components/ui/icons";
import { signOut, useSession } from "@/lib/auth/client";

export function UserDropdown() {
  const router = useRouter();
  const { data: session } = useSession();

  const user = session?.user ?? null;
  const userDisplayName = user?.name ?? user?.email ?? "User";
  const userEmail = user?.email ?? "";
  const userAvatarUrl = user?.image ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded text-left text-sm hover:cursor-pointer disabled:opacity-50"
          disabled={!user}
          type="button"
        >
          <Avatar className="size-8 rounded">
            {userAvatarUrl && (
              <AvatarImage alt={userDisplayName} src={userAvatarUrl} />
            )}
            <AvatarFallback className="rounded">
              {userDisplayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        side="top"
        sideOffset={4}
      >
        <div className="mb-2 flex items-center gap-2 p-1">
          <Avatar className="size-8 rounded">
            {userAvatarUrl && (
              <AvatarImage alt={userDisplayName} src={userAvatarUrl} />
            )}
            <AvatarFallback className="rounded">
              {userDisplayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{userDisplayName}</span>
            {userEmail ? (
              <span className="truncate text-xs">{userEmail}</span>
            ) : null}
          </div>
        </div>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => router.push("/billing")}>
            <Icon className="mx-1 size-5" filledOnHover name="help" />
            Help
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/billing")}>
            <Icon className="mx-1 size-5" filledOnHover name="docs" />
            Docs
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/billing")}>
            <Icon className="mx-1 size-5" filledOnHover name="card" />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/settings")}>
            <Icon className="mx-1 size-5" filledOnHover name="settings" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            router.replace("/");
          }}
        >
          <Icon className="mx-1 size-5" filledOnHover name="logout" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserDropdown;
