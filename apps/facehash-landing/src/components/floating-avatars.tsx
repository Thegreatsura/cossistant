"use client";

import { Facehash } from "facehash";

const NAMES = [
	"Alice",
	"Bob",
	"Charlie",
	"Diana",
	"Eve",
	"Frank",
	"Grace",
	"Henry",
	"Ivy",
	"Jack",
	"Kate",
	"Leo",
	"Mia",
	"Noah",
	"Olivia",
	"Paul",
	"Quinn",
	"Ruby",
	"Sam",
	"Tina",
];

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

// Deterministic positions based on index
function getPosition(index: number) {
	const positions = [
		{ top: "5%", left: "8%" },
		{ top: "12%", right: "12%" },
		{ top: "25%", left: "3%" },
		{ top: "18%", right: "5%" },
		{ top: "35%", right: "8%" },
		{ top: "8%", left: "25%" },
		{ top: "45%", left: "5%" },
		{ top: "30%", right: "15%" },
		{ top: "55%", right: "3%" },
		{ top: "15%", left: "45%" },
		{ top: "65%", left: "8%" },
		{ top: "50%", right: "10%" },
		{ top: "75%", right: "6%" },
		{ top: "22%", right: "25%" },
		{ top: "80%", left: "4%" },
		{ top: "68%", right: "12%" },
		{ top: "85%", right: "8%" },
		{ top: "40%", left: "2%" },
		{ top: "90%", left: "10%" },
		{ top: "78%", right: "4%" },
	];
	return positions[index % positions.length];
}

function getSize(index: number) {
	const sizes = [32, 40, 48, 56, 36, 44, 52, 38, 46, 42];
	return sizes[index % sizes.length];
}

function getAnimationDelay(index: number) {
	return `${(index * 0.5) % 10}s`;
}

function getAnimationDuration(index: number) {
	const durations = [15, 18, 20, 22, 17, 19, 21, 16, 23, 14];
	return `${durations[index % durations.length]}s`;
}

// Bokeh effect - varying blur levels to simulate camera depth of field
// More faces in focus, with gradual blur falloff for depth
// Sharp (in focus): 8 faces - indices 0, 2, 5, 7, 10, 12, 15, 18
// Light blur (1px): indices 1, 6, 11, 16
// Medium blur (3px): indices 4, 9, 14, 19
// Heavy blur (6px): indices 3, 8, 13, 17
function getBlur(index: number): string {
	const sharpIndices = [0, 2, 5, 7, 10, 12, 15, 18];
	const lightBlurIndices = [1, 6, 11, 16];
	const heavyBlurIndices = [3, 8, 13, 17];

	if (sharpIndices.includes(index)) {
		return "0";
	}
	if (lightBlurIndices.includes(index)) {
		return "1px";
	}
	if (heavyBlurIndices.includes(index)) {
		return "6px";
	}
	return "3px"; // medium blur for the rest
}

export function FloatingAvatars() {
	return (
		<div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden">
			{NAMES.map((name, index) => {
				const position = getPosition(index);
				const size = getSize(index);
				const blur = getBlur(index);

				return (
					<div
						className="hover:!filter-none absolute flex animate-float flex-col items-center gap-1 transition-[filter] duration-300"
						key={name}
						style={{
							...position,
							animationDelay: getAnimationDelay(index),
							animationDuration: getAnimationDuration(index),
							filter: blur !== "0" ? `blur(${blur})` : undefined,
						}}
					>
						<Facehash
							colors={COLORS}
							intensity3d="subtle"
							interactive={false}
							name={name}
							size={size}
						/>
						<span
							className="text-[10px] text-[var(--muted-foreground)]"
							style={{ fontSize: Math.max(8, size / 5) }}
						>
							{name.toLowerCase()}
						</span>
					</div>
				);
			})}

			<style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
          }
          75% {
            transform: translateY(-25px) rotate(2deg);
          }
        }

        .animate-float {
          animation: float ease-in-out infinite;
        }
      `}</style>
		</div>
	);
}
