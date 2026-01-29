# facehash

Deterministic avatar faces from any string. Zero dependencies, works with React 18/19.

<p align="center">
  <img src="https://facehash.dev/og-image.png" alt="facehash examples" width="600" />
</p>

## Installation

```bash
npm install facehash
```

## Quick Start

```tsx
import { Facehash } from "facehash";

<Facehash name="john@example.com" />
```

Same string = same face. Always.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | Required | String to generate face from |
| `size` | `number \| string` | `40` | Size in pixels or CSS units |
| `colors` | `string[]` | - | Array of hex/hsl colors |
| `colorClasses` | `string[]` | - | Array of Tailwind classes (use instead of `colors`) |
| `variant` | `"gradient" \| "solid"` | `"gradient"` | Background style |
| `intensity3d` | `"none" \| "subtle" \| "medium" \| "dramatic"` | `"dramatic"` | 3D rotation effect |
| `interactive` | `boolean` | `true` | Animate on hover |
| `showInitial` | `boolean` | `true` | Show first letter below face |

## Examples

### Custom Colors

```tsx
<Facehash
  name="alice"
  colors={["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"]}
/>
```

### With Tailwind Classes

```tsx
<Facehash
  name="bob"
  colorClasses={["bg-pink-500", "bg-blue-500", "bg-green-500"]}
  className="rounded-full"
/>
```

### Flat Style (No 3D)

```tsx
<Facehash name="charlie" intensity3d="none" variant="solid" />
```

### Without Initial Letter

```tsx
<Facehash name="diana" showInitial={false} />
```

## Avatar with Image Fallback

For image avatars that fall back to Facehash when the image fails:

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "facehash";

<Avatar style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden" }}>
  <AvatarImage src="/photo.jpg" alt="User" />
  <AvatarFallback name="john@example.com" />
</Avatar>
```

`AvatarFallback` renders a `Facehash` by default. For initials instead:

```tsx
<AvatarFallback name="John Doe" facehash={false} />
```

## Exports

```tsx
// Main component
import { Facehash } from "facehash";

// Avatar compound components
import { Avatar, AvatarImage, AvatarFallback } from "facehash";

// Individual face components (for custom use)
import { RoundFace, CrossFace, LineFace, CurvedFace, FACES } from "facehash";

// Utilities
import { stringHash } from "facehash";

// Types
import type { FacehashProps, AvatarProps, AvatarFallbackProps, AvatarImageProps } from "facehash";
```

## License

MIT — Built by [Cossistant](https://cossistant.com)
