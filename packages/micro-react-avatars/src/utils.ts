/**
 * Simple hash function to generate consistent numbers from strings
 * Uses bitwise operations to ensure proper 32-bit integer handling
 */
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // Use bitwise operations to keep within 32-bit integer range
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get a consistent value between 0 and max based on a string
 */
export function getConsistentIndex(str: string, max: number): number {
  const hash = hashCode(str);
  return hash % max;
}

/**
 * Default color arrays
 */
export const BACKGROUND_COLORS = [
  "#F7F9FC",
  "#EEEDFD",
  "#FFEBEE",
  "#FDEFE2",
  "#E7F9F3",
  "#EDEEFD",
  "#ECFAFE",
  "#F2FFD1",
  "#FFF7E0",
  "#FDF1F7",
  "#EAEFE6",
  "#E0E6EB",
  "#E4E2F3",
  "#E6DFEC",
  "#E2F4E8",
  "#E6EBEF",
  "#EBE6EF",
  "#E8DEF6",
  "#D8E8F3",
  "#ECE1FE",
];

export const TEXT_COLORS = [
  "#060A23",
  "#4409B9",
  "#BD0F2C",
  "#C56511",
  "#216E55",
  "#05128A",
  "#1F84A3",
  "#526E0C",
  "#935F10",
  "#973562",
  "#69785E",
  "#2D3A46",
  "#280F6D",
  "#37364F",
  "#363548",
  "#4D176E",
  "#AB133E",
  "#420790",
  "#222A54",
  "#192251",
];

export const SHAPE_COLORS = [
  "#060A23",
  "#5E36F5",
  "#E11234",
  "#E87917",
  "#3EA884",
  "#0618BC",
  "#0FBBE6",
  "#87B80A",
  "#FFC933",
  "#EE77AF",
  "#69785E",
  "#2D3A46",
  "#280F6D",
  "#37364F",
  "#363548",
  "#4D176E",
  "#AB133E",
  "#420790",
  "#222A54",
  "#192251",
];

/**
 * Default color palettes for backwards compatibility
 */
export const defaultColors = {
  // Use the new default colors
  tailwind: BACKGROUND_COLORS,
  pastel: BACKGROUND_COLORS,
  vivid: SHAPE_COLORS,
  dark: TEXT_COLORS,
};

/**
 * Get avatar colors based on value
 */
export interface AvatarColors {
  background: string;
  foreground: string;
  shapeColor?: string;
}

export interface ColorPalette {
  backgrounds?: string[];
  texts?: string[];
  shapes?: string[];
}

export function getAvatarColors(
  value: string,
  palette?: string[] | ColorPalette
): AvatarColors {
  // Handle legacy single palette array
  if (Array.isArray(palette)) {
    const index = getConsistentIndex(value, palette.length);
    const background = palette[index] || palette[0] || "#F7F9FC";

    const rgb = hexToRgb(background);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    const isLightBg = brightness > 128;

    return {
      background,
      foreground: isLightBg ? "#000000" : "#ffffff",
    };
  }

  // Use the new three-color system
  const backgrounds = palette?.backgrounds || BACKGROUND_COLORS;
  const texts = palette?.texts || TEXT_COLORS;
  const shapes = palette?.shapes || SHAPE_COLORS;

  const index = getConsistentIndex(
    value,
    Math.max(backgrounds.length, texts.length, shapes.length)
  );

  const backgroundIndex = index % backgrounds.length;
  const textIndex = index % texts.length;
  const shapeIndex = index % shapes.length;

  return {
    background: backgrounds[backgroundIndex] || backgrounds[0] || "#F7F9FC",
    foreground: texts[textIndex] || texts[0] || "#060A23",
    shapeColor: shapes[shapeIndex] || shapes[0] || "#060A23",
  };
}

const hexColorRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = hexColorRegex.exec(hex);
  return result && result[1] && result[2] && result[3]
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
