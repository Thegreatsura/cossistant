# @cossistant/micro-react-avatars

A lightweight, customizable React avatar library with predictable generation. A modern alternative to unmaintained avatar libraries with better customizability and automatic dark mode support.

## Features

- 🎨 **60 unique shapes** - Beautiful, hand-crafted SVG shapes
- 🎯 **Predictable generation** - Same input always generates the same avatar
- 🌙 **Automatic dark mode** - Detects `.dark` class and adapts colors automatically
- 🎨 **Multiple color palettes** - Tailwind, pastel, vivid, dark themes
- 🎨 **Smart contrast** - Automatically calculates readable text colors
- 📦 **Lightweight** - No dependencies, tree-shakeable
- 🦾 **TypeScript** - Full type safety
- ♿ **Accessible** - Proper ARIA labels and roles

## Installation

```bash
npm install @cossistant/micro-react-avatars
# or
yarn add @cossistant/micro-react-avatars
# or
pnpm add @cossistant/micro-react-avatars
```

## Usage

### Basic Usage

```tsx
import Avatar from "@cossistant/micro-react-avatars";

function App() {
  return <Avatar value="user@example.com" />;
}
```

The avatar automatically adapts to dark mode when a `.dark` class is present on `<html>` or `<body>` (Tailwind CSS pattern).

### With Options

```tsx
import Avatar from "@cossistant/micro-react-avatars";

function App() {
  return (
    <Avatar value="user@example.com" size={128} radius="xl" shadow="medium" />
  );
}
```

### Automatic Dark Mode

The component automatically detects dark mode and switches to appropriate colors:

```tsx
import Avatar from "@cossistant/micro-react-avatars";

// Automatically uses light colors in light mode, dark colors in dark mode
<Avatar value="user@example.com" />

// Or explicitly set palette to "auto" (default)
<Avatar value="user@example.com" palette="auto" />
```

### Custom Colors

```tsx
import Avatar from "@cossistant/micro-react-avatars";

function App() {
  return (
    <Avatar
      value="user@example.com"
      colors={["#FF6B6B", "#4ECDC4", "#45B7D1", "#96E6B3"]}
    />
  );
}
```

### Display Initials

```tsx
import Avatar from "@cossistant/micro-react-avatars";

function App() {
  return <Avatar value="John Doe" displayMode="initials" />;
}
```

### Override Shape

```tsx
import Avatar from "@cossistant/micro-react-avatars";

function App() {
  return (
    <Avatar
      value="user@example.com"
      shapeIndex={5} // Use shape 5 specifically
    />
  );
}
```

## Props

| Prop              | Type                                                    | Default    | Description                                         |
| ----------------- | ------------------------------------------------------- | ---------- | --------------------------------------------------- |
| `value`           | `string`                                                | -          | **Required**. The value to generate the avatar from |
| `size`            | `number`                                                | `64`       | Size of the avatar in pixels                        |
| `colors`          | `string[]`                                              | -          | Custom color palette                                |
| `palette`         | `'auto' \| 'tailwind' \| 'pastel' \| 'vivid' \| 'dark'` | `'auto'`   | Color palette ('auto' adapts to theme)              |
| `shadow`          | `'none' \| 'soft' \| 'medium' \| 'large'`               | `'soft'`   | Shadow style                                        |
| `radius`          | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'circle'`    | `'circle'` | Border radius                                       |
| `className`       | `string`                                                | -          | Additional CSS classes                              |
| `style`           | `CSSProperties`                                         | -          | Custom styles                                       |
| `displayMode`     | `'shape' \| 'initials'`                                 | `'shape'`  | Display mode                                        |
| `shapeIndex`      | `number`                                                | -          | Override shape selection (0-59)                     |
| `backgroundColor` | `string`                                                | -          | Override background color                           |
| `foregroundColor` | `string`                                                | -          | Override foreground color                           |
| `alt`             | `string`                                                | -          | Alt text for accessibility                          |
| `role`            | `string`                                                | `'img'`    | ARIA role                                           |
| `aria-label`      | `string`                                                | -          | ARIA label                                          |

## Dark Mode Support

The library automatically detects dark mode by checking for the `.dark` class on the document (following Tailwind CSS convention).

### How it Works

1. **Automatic Detection**: The component checks if `.dark` class exists on `<html>` or `<body>`
2. **Smart Palette Selection**: When `palette="auto"` (default), it uses:
   - Light mode: `tailwind` palette (vibrant colors)
   - Dark mode: `dark` palette (deeper, muted colors)
3. **Contrast Calculation**: Automatically calculates readable foreground colors

### Examples

```tsx
// Automatically adapts to theme
<Avatar value="user@example.com" />

// Force a specific palette regardless of theme
<Avatar value="user@example.com" palette="pastel" />

// Override with custom colors
<Avatar
  value="user@example.com"
  backgroundColor="#1a1a1a"
  foregroundColor="#ffffff"
/>
```

### Tailwind CSS Integration

If you're using Tailwind CSS with dark mode, the avatar will automatically adapt:

```tsx
// In your layout/app component
<html className="dark">
  <body>
    {/* Avatar automatically uses dark palette */}
    <Avatar value="user@example.com" />
  </body>
</html>
```

## Advanced Usage

### Access Individual Shapes

```tsx
import { shapes, getShape } from "@cossistant/micro-react-avatars";

// Get a specific shape component
const Shape5 = getShape(5);

// Use it directly
<Shape5 size={32} className="my-icon" />;
```

### Use Utility Functions

```tsx
import {
  getConsistentIndex,
  getAvatarColors,
  defaultColors,
} from "@cossistant/micro-react-avatars";

// Get consistent index from string
const shapeIndex = getConsistentIndex("user@example.com", 60);

// Get avatar colors
const colors = getAvatarColors("user@example.com", defaultColors.pastel);
```

## Tailwind CSS Classes

The component works great with Tailwind utilities:

```tsx
<Avatar
  value="user@example.com"
  className="ring-2 ring-white ring-offset-2 ring-offset-gray-100 dark:ring-gray-800 dark:ring-offset-gray-900"
/>
```

## Migration from Avvvatars

This library is designed as a drop-in replacement for Avvvatars with better features:

```tsx
// Before (Avvvatars)
import Avvvatars from "avvvatars-react";
<Avvvatars value="user@example.com" />;

// After (micro-react-avatars) - with automatic dark mode!
import Avatar from "@cossistant/micro-react-avatars";
<Avatar value="user@example.com" />;
```

## Built-in Palettes

- **`auto`** (default): Automatically selects based on theme
- **`tailwind`**: Standard Tailwind colors (great for light mode)
- **`pastel`**: Soft, muted colors
- **`vivid`**: Bright, saturated colors
- **`dark`**: Deep colors optimized for dark backgrounds

## License

MIT
