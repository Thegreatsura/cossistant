// Main components

export {
	Avatar,
	type AvatarContextValue,
	type AvatarProps,
	useAvatarContext,
} from "./avatar";
export { AvatarFallback, type AvatarFallbackProps } from "./avatar-fallback";
export { AvatarImage, type AvatarImageProps } from "./avatar-image";
export { FacehashAvatar, type FacehashAvatarProps } from "./facehash-avatar";

// Faces (for advanced customization)
export {
	CrossFace,
	CurvedFace,
	FACES,
	type FaceComponent,
	type FaceProps,
	LineFace,
	RoundFace,
} from "./faces";
export {
	type ColorPalette,
	DEFAULT_COLORS,
	DEFAULT_COLORS_DARK,
	DEFAULT_COLORS_LIGHT,
} from "./utils/colors";
// Utilities
export { stringHash } from "./utils/hash";
