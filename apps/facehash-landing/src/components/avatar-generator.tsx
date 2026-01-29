"use client";

import { Facehash } from "facehash";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Cossistant brand colors
const COLORS = [
	"hsla(314, 100%, 80%, 1)", // pink
	"hsla(58, 93%, 72%, 1)", // yellow
	"hsla(218, 92%, 72%, 1)", // blue
	"hsla(19, 99%, 44%, 1)", // orange
	"hsla(156, 86%, 40%, 1)", // green
	"hsla(314, 100%, 85%, 1)", // light pink
	"hsla(58, 92%, 79%, 1)", // light yellow
	"hsla(218, 91%, 78%, 1)", // light blue
	"hsla(19, 99%, 50%, 1)", // light orange
	"hsla(156, 86%, 64%, 1)", // light green
];

const SIZES = [32, 48, 64, 80];

const SHAPES = [
	{ id: "square", label: "square", radius: "0" },
	{ id: "squircle", label: "squircle", radius: "30%" },
	{ id: "rounded", label: "round", radius: "9999px" },
] as const;

export function AvatarGenerator() {
	const [name, setName] = useState("your name");
	const [shape, setShape] = useState<string>("square");

	const currentShape = SHAPES.find((s) => s.id === shape);
	const borderRadius = currentShape?.radius || "9999px";

	return (
		<div className="mx-auto w-full max-w-md">
			{/* Name input */}
			<input
				className="w-full border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-base transition-all placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
				maxLength={50}
				onChange={(e) => setName(e.target.value)}
				placeholder="type any name..."
				type="text"
				value={name}
			/>

			{/* Shape selector */}
			<div className="mt-4 flex gap-1">
				{SHAPES.map((s) => (
					<button
						className={cn(
							"px-3 py-1 text-xs transition-colors",
							shape === s.id
								? "bg-[var(--foreground)] text-[var(--background)]"
								: "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
						)}
						key={s.id}
						onClick={() => setShape(s.id)}
						type="button"
					>
						[{s.label}]
					</button>
				))}
			</div>

			{/* Avatar preview */}
			<div className="mt-6 flex flex-wrap items-end gap-4">
				{SIZES.map((size) => (
					<div className="flex flex-col items-center gap-2" key={size}>
						<Facehash
							className="transition-all duration-300"
							colors={COLORS}
							intensity3d="medium"
							name={name || "anonymous"}
							size={size}
							style={{ borderRadius }}
						/>
						<span className="text-[var(--muted-foreground)] text-xs">
							{size}
						</span>
					</div>
				))}
			</div>

			{/* Variants row */}
			<div className="mt-8 flex items-center gap-5">
				<div className="flex flex-col items-center gap-1">
					<Facehash
						className=""
						colors={COLORS}
						intensity3d="dramatic"
						name={name || "anonymous"}
						size={48}
						style={{ borderRadius }}
					/>
					<span className="text-[10px] text-[var(--muted-foreground)]">
						[3d]
					</span>
				</div>
				<div className="flex flex-col items-center gap-1">
					<Facehash
						className=""
						colors={COLORS}
						intensity3d="none"
						name={name || "anonymous"}
						size={48}
						style={{ borderRadius }}
						variant="solid"
					/>
					<span className="text-[10px] text-[var(--muted-foreground)]">
						[flat]
					</span>
				</div>
				<div className="flex flex-col items-center gap-1">
					<Facehash
						className=""
						colors={COLORS}
						intensity3d="medium"
						name={name || "anonymous"}
						showInitial={false}
						size={48}
						style={{ borderRadius }}
					/>
					<span className="text-[10px] text-[var(--muted-foreground)]">
						[no letter]
					</span>
				</div>
			</div>
		</div>
	);
}
