"use client";

import { useSupport } from "@cossistant/next";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { switchWebsite } from "@/app/actions/switch-website";
import { Avatar } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Icon from "@/components/ui/icons";
import { useOrganizationWebsites, useWebsite } from "@/contexts/website";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { authClient, signOut } from "@/lib/auth/client";

type NavigationDropdownProps = {
	websiteSlug: string;
};

export function NavigationDropdown({ websiteSlug }: NavigationDropdownProps) {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const { setTheme, resolvedTheme } = useTheme();
	const { open } = useSupport();
	const website = useWebsite();
	const organizationWebsites = useOrganizationWebsites();
	const { canCreateWebsite } = useOrganizationRole();
	const [isPending, startTransition] = useTransition();

	const user = session?.user ?? null;
	const userEmail = user?.email ?? "";
	const userDisplayName = user?.name ?? userEmail ?? "You";
	const userAvatarUrl = user?.image ?? null;

	const websiteName = website?.name ?? "";
	const websiteLogoUrl = website?.logoUrl ?? null;
	const organizationSlug = website?.organizationSlug ?? "";

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

	const handleSwitchWebsite = async (targetWebsiteId: string) => {
		startTransition(async () => {
			try {
				const slug = await switchWebsite(targetWebsiteId);
				router.push(`/${slug}/inbox`);
			} catch (error) {
				console.error("Failed to switch website:", error);
			}
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					className="group flex items-center gap-2.5 rounded px-3 py-2.5 text-left text-primary/80 text-sm hover:cursor-pointer hover:bg-background-200 hover:text-primary disabled:opacity-50 dark:hover:bg-background-300"
					disabled={!user || isPending}
					type="button"
				>
					<Avatar
						className="size-5"
						fallbackName={websiteName}
						url={websiteLogoUrl}
					/>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate">{websiteName}</span>
					</div>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
				side="top"
				sideOffset={4}
			>
				<DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5">
					<Avatar
						className="size-6"
						fallbackName={userDisplayName}
						url={userAvatarUrl}
					/>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{userDisplayName}</span>
						<span className="truncate text-muted-foreground text-xs">
							{userEmail}
						</span>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuLabel className="px-2 py-1.5 font-normal text-muted-foreground text-xs">
						Websites
					</DropdownMenuLabel>
					{organizationWebsites.map((site) => (
						<DropdownMenuItem
							disabled={isPending}
							key={site.id}
							onSelect={() => {
								if (site.id !== website?.id) {
									handleSwitchWebsite(site.id);
								}
							}}
						>
							<Avatar
								className="mx-1 size-4"
								fallbackName={site.name}
								url={site.logoUrl}
							/>
							<span className="flex-1">{site.name}</span>
							{site.id === website?.id && (
								<Icon className="size-4 text-primary" name="check" />
							)}
						</DropdownMenuItem>
					))}
					{canCreateWebsite && (
						<DropdownMenuItem
							onSelect={() => router.push(`/welcome/${organizationSlug}`)}
						>
							<Icon className="mx-1 size-4" name="plus" />
							Create website
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>

				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onSelect={() => open()}>
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

export default NavigationDropdown;
