// Default export for compatibility with Avvvatars API

export type { AvatarProps } from "./Avatar";
export { Avatar as default, Avatar } from "./Avatar";
export type { ShapeProps } from "./shapes";
export { getShape, shapes } from "./shapes";
export {
  type AvatarColors,
  BACKGROUND_COLORS,
  type ColorPalette,
  defaultColors,
  getAvatarColors,
  getConsistentIndex,
  hashCode,
  SHAPE_COLORS,
  TEXT_COLORS,
} from "./utils";
