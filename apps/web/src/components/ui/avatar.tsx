"use client";

import {
	PRESENCE_AWAY_WINDOW_MS,
	PRESENCE_ONLINE_WINDOW_MS,
} from "@cossistant/types";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { FacehashAvatar } from "facehash";
import type * as React from "react";
import { useMemo } from "react";
import { formatTimeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";
import { TooltipOnHover } from "./tooltip";

function AvatarContainer({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
			className={cn(
				"relative flex size-8 shrink-0 overflow-hidden",
				"[corner-shape:squircle]",
				className
			)}
			data-slot="avatar"
			style={{
				borderRadius: "calc(20% * var(--avatar-border-radius-multiplier, 1))",
			}}
			{...props}
		/>
	);
}

function AvatarImage({
	className,
	...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			className={cn("aspect-square size-full", className)}
			data-slot="avatar-image"
			{...props}
		/>
	);
}

interface AvatarFallbackProps
	extends React.ComponentProps<typeof AvatarPrimitive.Fallback> {
	value?: string;
	withBoringAvatar?: boolean;
	children?: string;
}

const REGEX_SPLIT_INITIALS = /\s+/;

/**
 * BoringAvatar - Styled wrapper around facehash primitive
 * with Cossistant brand colors and 3D effects
 */
function BoringAvatar({
	className,
	name,
}: {
	className?: string;
	name: string;
}) {
	// Cossistant brand color classes for light/dark mode
	const colorClasses = [
		"dark:bg-cossistant-pink/90 bg-cossistant-pink/20",
		"dark:bg-cossistant-yellow/90 bg-cossistant-yellow/20",
		"dark:bg-cossistant-blue/90 bg-cossistant-blue/20",
		"dark:bg-cossistant-orange/90 bg-cossistant-orange/20",
		"dark:bg-cossistant-green/90 bg-cossistant-green/20",
	];

	// Simple hash function to get consistent color index
	const colorIndex = useMemo(() => {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			const char = name.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash &= hash;
		}
		return Math.abs(hash) % colorClasses.length;
	}, [name, colorClasses.length]);

	const colorClass = colorClasses[colorIndex];

	return (
		<div
			className={cn(
				"relative flex size-full items-center justify-center overflow-hidden",
				colorClass,
				className
			)}
		>
			{/* Gradient overlay for depth effect */}
			<div className="absolute inset-0 bg-radial from-primary/10 via-from-primary/40 to-transparent opacity-100 shadow-inner dark:from-background/90 dark:to-background/50" />

			{/* FacehashAvatar primitive with styling */}
			<FacehashAvatar
				className={cn(
					"absolute inset-0 z-10 flex scale-[0.85] flex-col items-center justify-center",
					"text-primary transition-all delay-500 duration-200",
					"group-hover/conversation-item:scale-90",
					"group-focus/conversation-item:scale-90",
					"[&_svg]:fill-current"
				)}
				enable3D={true}
				name={name}
				showInitial={true}
				style={{
					backgroundColor: "transparent",
					containerType: "size",
				}}
			/>
		</div>
	);
}

function AvatarFallback({
	className,
	value,
	children,
	withBoringAvatar = false,
	...props
}: AvatarFallbackProps) {
	const getInitials = (str: string) =>
		str
			.split(REGEX_SPLIT_INITIALS)
			.map((word) => word.charAt(0))
			.join("")
			.toUpperCase()
			.slice(0, 2);

	return (
		<AvatarPrimitive.Fallback
			className={cn(
				"flex size-full items-center justify-center",
				!value && "text-[10px] text-primary",
				className
			)}
			data-slot="avatar-fallback"
			{...props}
		>
			{withBoringAvatar ? (
				<BoringAvatar name={value ?? children ?? ""} />
			) : (
				getInitials(value ?? children ?? "")
			)}
		</AvatarPrimitive.Fallback>
	);
}

function Avatar({
	className,
	url,
	fallbackName,
	lastOnlineAt,
	status,
	withBoringAvatar = false,
}: {
	className?: string;
	url: string | null | undefined;
	fallbackName: string;
	lastOnlineAt?: string | null;
	status?: "online" | "away";
	withBoringAvatar?: boolean;
}) {
	const now = Date.now();
	const lastOnlineDate = lastOnlineAt ? new Date(lastOnlineAt) : null;
	const lastOnlineTime = lastOnlineDate ? lastOnlineDate.getTime() : null;

	let computedStatus: "online" | "away" | null = status ?? null;

	if (
		!computedStatus &&
		lastOnlineTime !== null &&
		!Number.isNaN(lastOnlineTime)
	) {
		if (lastOnlineTime >= now - PRESENCE_ONLINE_WINDOW_MS) {
			computedStatus = "online";
		} else if (lastOnlineTime >= now - PRESENCE_AWAY_WINDOW_MS) {
			computedStatus = "away";
		}
	}

	const isOnline = computedStatus === "online";
	const isAway = computedStatus === "away";
	const awayWindowMinutes = Math.round(PRESENCE_AWAY_WINDOW_MS / 60_000);

	const tooltipContent = lastOnlineDate
		? isOnline
			? `${fallbackName} is online`
			: isAway
				? `${fallbackName} last seen less than ${awayWindowMinutes} minutes ago`
				: `${fallbackName} last seen ${formatTimeAgo(lastOnlineDate)}`
		: null;

	return (
		<TooltipOnHover content={tooltipContent}>
			<div className="relative">
				<AvatarContainer
					className={cn(
						"size-8 shrink-0 ring-1 ring-border ring-offset-1 ring-offset-background",
						className
					)}
				>
					{url && <AvatarImage alt={fallbackName} src={url} />}
					<AvatarFallback
						className="pointer-events-none"
						withBoringAvatar={withBoringAvatar}
					>
						{fallbackName}
					</AvatarFallback>
				</AvatarContainer>
				{(isOnline || isAway) && (
					<div
						className={cn(
							"-right-1 absolute bottom-0.5 hidden size-[5px] rounded-full ring-2 ring-background",
							{
								"block bg-cossistant-green": isOnline,
								"block bg-cossistant-orange": isAway,
							}
						)}
					/>
				)}
			</div>
		</TooltipOnHover>
	);
}

export { AvatarContainer, AvatarImage, AvatarFallback, Avatar, BoringAvatar };
