import * as React from "react";
import { getShape } from "./shapes";
import {
  type AvatarColors,
  BACKGROUND_COLORS,
  type ColorPalette,
  defaultColors,
  getAvatarColors,
  getConsistentIndex,
  SHAPE_COLORS,
  TEXT_COLORS,
} from "./utils";

export interface AvatarProps {
  /**
   * The value to generate the avatar from (e.g., email, username, id)
   * This ensures the same value always generates the same avatar
   */
  value: string;

  /**
   * Size of the avatar in pixels
   * @default 64
   */
  size?: number;

  /**
   * Custom color palette to use
   * Can be either a simple array of colors or an object with backgrounds, texts, and shapes arrays
   * @default uses the new default color system
   */
  colors?: string[] | ColorPalette;

  /**
   * Use a preset color palette
   * @default 'auto' (automatically selects based on theme)
   */
  palette?: "auto" | "tailwind" | "pastel" | "vivid" | "dark";

  /**
   * Shadow style
   * @default 'soft'
   */
  shadow?: "none" | "soft" | "medium" | "large";

  /**
   * Border radius style
   * @default 'circle'
   */
  radius?: "none" | "sm" | "md" | "lg" | "xl" | "circle";

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Custom style object
   */
  style?: React.CSSProperties;

  /**
   * Display mode
   * @default 'shape'
   */
  displayMode?: "shape" | "initials";

  /**
   * Override the shape index (0-59)
   */
  shapeIndex?: number;

  /**
   * Override background color
   */
  backgroundColor?: string;

  /**
   * Override foreground color
   */
  foregroundColor?: string;

  /**
   * Accessibility: Alt text for the avatar
   */
  alt?: string;

  /**
   * Accessibility: Role for the avatar
   * @default 'img'
   */
  role?: string;

  /**
   * Accessibility: ARIA label
   */
  "aria-label"?: string;
}

const radiusMap = {
  none: "0",
  sm: "0.125rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  circle: "50%",
};

const shadowMap = {
  none: "none",
  soft: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  medium: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  large: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
};

/**
 * Check if dark mode is active by looking for .dark class
 */
function useIsDarkMode() {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    // Check on mount and when class changes
    const checkDarkMode = () => {
      const hasDarkClass =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark");
      setIsDark(hasDarkClass);
    };

    checkDarkMode();

    // Watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      value,
      size = 64,
      colors,
      palette = "auto",
      shadow = "soft",
      radius = "circle",
      className,
      style,
      displayMode = "shape",
      shapeIndex,
      backgroundColor,
      foregroundColor,
      alt,
      role = "img",
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const isDarkMode = useIsDarkMode();

    // Get the color palette based on theme
    const colorPalette = React.useMemo(() => {
      if (colors) {
        return colors;
      }

      // For the new color system, return a ColorPalette object
      if (palette === "auto") {
        return {
          backgrounds: BACKGROUND_COLORS,
          texts: TEXT_COLORS,
          shapes: SHAPE_COLORS,
        };
      }

      // For backwards compatibility with old palette names
      return (
        defaultColors[palette] || {
          backgrounds: BACKGROUND_COLORS,
          texts: TEXT_COLORS,
          shapes: SHAPE_COLORS,
        }
      );
    }, [colors, palette, isDarkMode]);

    // Calculate colors based on value
    const calculatedColors = React.useMemo<AvatarColors>(() => {
      if (backgroundColor && foregroundColor) {
        return {
          background: backgroundColor,
          foreground: foregroundColor,
        };
      }

      return getAvatarColors(value, colorPalette);
    }, [value, colorPalette, backgroundColor, foregroundColor]);

    // Get the shape component
    const shapeComponentIndex = React.useMemo(() => {
      if (typeof shapeIndex === "number") {
        return shapeIndex;
      }
      return getConsistentIndex(value, 16); // Using first 16 shapes by default
    }, [value, shapeIndex]);

    const ShapeComponent = React.useMemo(() => {
      return getShape(shapeComponentIndex);
    }, [shapeComponentIndex]);

    // Extract initials if needed
    const initials = React.useMemo(() => {
      if (displayMode !== "initials") {
        return "";
      }

      const words = value.trim().split(" ").filter(Boolean);
      if (words.length === 0) {
        return "?";
      }
      const firstWord = words[0];
      if (!firstWord) {
        return "?";
      }
      if (words.length === 1) {
        return firstWord.substring(0, 2).toUpperCase();
      }
      const lastWord = words[words.length - 1];
      if (!lastWord) {
        return firstWord[0]?.toUpperCase() || "?";
      }
      return ((firstWord[0] || "") + (lastWord[0] || "")).toUpperCase();
    }, [value, displayMode]);

    const containerStyle: React.CSSProperties = {
      width: size,
      height: size,
      borderRadius: radiusMap[radius],
      boxShadow: shadowMap[shadow],
      backgroundColor: calculatedColors.background,
      color:
        displayMode === "shape" && calculatedColors.shapeColor
          ? calculatedColors.shapeColor
          : calculatedColors.foreground,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      ...style,
    };

    const accessibilityProps = {
      role,
      "aria-label": ariaLabel || alt || `Avatar for ${value}`,
    };

    return (
      <div
        className={className}
        ref={ref}
        style={containerStyle}
        {...accessibilityProps}
        {...props}
      >
        {displayMode === "shape" && ShapeComponent ? (
          <ShapeComponent className="avatar-shape" size={size * 0.5} />
        ) : (
          <span
            style={{
              fontSize: size * 0.4,
              fontWeight: 600,
              userSelect: "none",
            }}
          >
            {initials}
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";
