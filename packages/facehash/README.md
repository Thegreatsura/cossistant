# facehash

Deterministic avatar faces from any string. Zero dependencies, unstyled, React 18/19 compatible.

Following the [shadcn/ui](https://ui.shadcn.com/) philosophy: **unstyled, composable, and yours to customize**.

<p align="center">
  <img src="https://cossistant.com/facehash-preview.png" alt="facehash examples" width="600" />
</p>

## Features

- **Deterministic** - Same string always generates the same face
- **Unstyled** - Zero CSS included, bring your own Tailwind/CSS
- **Composable** - Use standalone or as part of Avatar compound component
- **Dark mode ready** - Built-in light/dark color palette support
- **Accessible** - Proper ARIA attributes included
- **Tiny** - Zero dependencies (React is a peer dep)
- **TypeScript** - Full type safety

## Installation

```bash
npm install facehash
# or
pnpm add facehash
# or
bun add facehash
```

## Quick Start

### Standalone FacehashAvatar

The simplest way to get started - just a fun face!

```tsx
import { FacehashAvatar } from "facehash";

function App() {
  return (
    <FacehashAvatar
      name="John Doe"
      className="w-10 h-10 rounded-full"
    />
  );
}
```

### With Avatar Compound Component

For image avatars with FacehashAvatar as fallback:

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "facehash";

function UserAvatar({ user }) {
  return (
    <Avatar className="w-10 h-10 rounded-full overflow-hidden">
      <AvatarImage src={user.avatarUrl} alt={user.name} />
      <AvatarFallback name={user.name} facehash />
    </Avatar>
  );
}
```

## Usage Examples

### Basic Styling with Tailwind

```tsx
<FacehashAvatar
  name="Jane Smith"
  className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800"
/>
```

### Custom Color Palette

```tsx
<FacehashAvatar
  name="Alex Johnson"
  colors={["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"]}
  className="w-16 h-16 rounded-full"
/>
```

### Light/Dark Mode Colors

```tsx
<FacehashAvatar
  name="Sam Wilson"
  colorsLight={["#fce7f3", "#fef3c7", "#dbeafe"]}
  colorsDark={["#db2777", "#d97706", "#2563eb"]}
  colorScheme="auto" // Uses CSS prefers-color-scheme
  className="w-10 h-10 rounded-full"
/>
```

### Without 3D Effect

```tsx
<FacehashAvatar
  name="Chris Brown"
  enable3D={false}
  className="w-10 h-10 rounded-lg"
/>
```

### Without Initial Letter

```tsx
<FacehashAvatar
  name="Taylor Swift"
  showInitial={false}
  className="w-10 h-10 rounded-full"
/>
```

### Avatar with Initials Fallback

```tsx
<Avatar className="w-10 h-10 rounded-full bg-gray-200">
  <AvatarImage src="/photo.jpg" alt="User" />
  <AvatarFallback name="John Doe" className="text-sm font-medium" />
</Avatar>
```

### Avatar with Custom Fallback

```tsx
import { User } from "lucide-react";

<Avatar className="w-10 h-10 rounded-full bg-gray-200">
  <AvatarImage src="/photo.jpg" alt="User" />
  <AvatarFallback>
    <User className="w-5 h-5 text-gray-500" />
  </AvatarFallback>
</Avatar>
```

### Delayed Fallback (Prevent Flash)

```tsx
<Avatar className="w-10 h-10 rounded-full">
  <AvatarImage src="/slow-loading-image.jpg" />
  <AvatarFallback name="John" facehash delayMs={600} />
</Avatar>
```

## Styling with CSS

### Using CSS Variables (Dark Mode)

When using `colorScheme="auto"`, the component sets CSS custom properties:

```css
/* Apply the background based on color scheme */
[data-facehash-avatar][data-color-scheme="auto"] {
  background-color: var(--facehash-avatar-bg-light);
}

@media (prefers-color-scheme: dark) {
  [data-facehash-avatar][data-color-scheme="auto"] {
    background-color: var(--facehash-avatar-bg-dark);
  }
}
```

### Using Data Attributes

All components expose data attributes for styling:

```css
/* Root avatar */
[data-avatar] { }
[data-avatar][data-state="loading"] { }
[data-avatar][data-state="loaded"] { }
[data-avatar][data-state="error"] { }

/* Facehash avatar */
[data-facehash-avatar] { }
[data-facehash-avatar-face] { }
[data-facehash-avatar-initial] { }

/* Image and fallback */
[data-avatar-image] { }
[data-avatar-fallback] { }
```

## API Reference

### FacehashAvatar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | Required | Name used to generate deterministic avatar |
| `colors` | `string[]` | Tailwind colors | Base color palette |
| `colorsLight` | `string[]` | Light variants | Colors for light mode |
| `colorsDark` | `string[]` | Dark variants | Colors for dark mode |
| `colorScheme` | `"light" \| "dark" \| "auto"` | `"auto"` | Color scheme to use |
| `showInitial` | `boolean` | `true` | Show first letter below face |
| `enable3D` | `boolean` | `true` | Enable 3D sphere rotation effect |

### Avatar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asChild` | `boolean` | `false` | Render as child element (Slot pattern) |

### AvatarImage

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string \| null` | - | Image source URL |
| `alt` | `string` | `""` | Alt text for accessibility |
| `onLoadingStatusChange` | `(status) => void` | - | Callback on status change |

### AvatarFallback

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | `""` | Name for initials/FacehashAvatar |
| `facehash` | `boolean` | `false` | Use FacehashAvatar instead of initials |
| `facehashProps` | `FacehashAvatarProps` | - | Props to pass to FacehashAvatar |
| `delayMs` | `number` | `0` | Delay before showing fallback |
| `children` | `ReactNode` | - | Custom fallback content |

## Exports

```tsx
// Components
import {
  FacehashAvatar,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "facehash";

// Face components (for custom compositions)
import {
  RoundFace,
  CrossFace,
  LineFace,
  CurvedFace,
  FACES,
} from "facehash";

// Utilities
import {
  stringHash,
  DEFAULT_COLORS,
  DEFAULT_COLORS_LIGHT,
  DEFAULT_COLORS_DARK,
} from "facehash";

// Hooks
import { useAvatarContext } from "facehash";
```

## Recipes

### Next.js App Router

```tsx
// components/user-avatar.tsx
"use client";

import { Avatar, AvatarImage, AvatarFallback } from "facehash";

export function UserAvatar({ user }: { user: { name: string; image?: string } }) {
  return (
    <Avatar className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
      {user.image && <AvatarImage src={user.image} alt={user.name} />}
      <AvatarFallback
        name={user.name}
        facehash
        className="flex h-full w-full items-center justify-center"
      />
    </Avatar>
  );
}
```

### Tailwind with Ring

```tsx
<Avatar className="h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-900">
  <AvatarImage src={url} />
  <AvatarFallback name="John Doe" facehash />
</Avatar>
```

### Avatar Group

```tsx
function AvatarGroup({ users }) {
  return (
    <div className="flex -space-x-2">
      {users.map((user) => (
        <Avatar
          key={user.id}
          className="h-8 w-8 rounded-full ring-2 ring-white"
        >
          <AvatarImage src={user.avatar} />
          <AvatarFallback name={user.name} facehash />
        </Avatar>
      ))}
    </div>
  );
}
```

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## Credits

Built with love by the [Cossistant](https://cossistant.com) team.

Inspired by [Boring Avatars](https://boringavatars.com/) by Josep Martins.

## License

MIT
