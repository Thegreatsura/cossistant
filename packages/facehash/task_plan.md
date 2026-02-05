# Task Plan: Fix Facehash Color Styling - COMPLETE

## Goal
Create a **good developer experience** for styling Facehash with standard Tailwind classes.

## Solution: Pure Inheritance + Wrapper Pattern ✅

- Removed all inline color/font styles (no defaults)
- CSS inheritance works naturally
- For app-wide defaults, users create a wrapper with `tailwind-merge`

## Why No Built-in Defaults?

Facehash is **zero-dependency**. Adding `tailwind-merge` would break that.

The wrapper pattern is:
- Standard in React ecosystem (shadcn pattern)
- Gives users full control
- Properly handles class conflicts via `tailwind-merge`

## What Was Done

### 1. facehash.tsx
- Removed inline `color` from face container
- Removed inline `fontFamily` and `fontWeight` from initial span
- Added `"facehash"` class to root for targeting
- CSS now inherits naturally from parent

### 2. facehash-landing props-examples.tsx
- Updated "className (styling)" section with wrapper pattern example

## Recommended Usage

### Per-instance styling
```tsx
<Facehash name="user" className="text-blue-500" />
<Facehash name="user" className="text-gray-300 font-sans" />
```

### App-wide defaults (wrapper pattern)
```tsx
// components/avatar.tsx
import { Facehash, type FacehashProps } from "facehash";
import { cn } from "@/lib/utils"; // tailwind-merge

export function Avatar({ className, ...props }: FacehashProps) {
  return (
    <Facehash
      className={cn("text-black font-mono font-bold", className)}
      {...props}
    />
  );
}

// Usage - overrides work naturally:
<Avatar name="user" />                          // defaults
<Avatar name="user" className="text-red-500" /> // red, still mono & bold
```

## Selectors Available

| Selector | Element |
|----------|---------|
| `.facehash` | Root container (class) |
| `[data-facehash]` | Root container (data attr) |
| `[data-facehash-face]` | Face container (eyes + mouth) |
| `[data-facehash-initial]` | Initial letter |
| `[data-facehash-gradient]` | Gradient overlay |
| `[data-facehash-mouth]` | Custom mouth area |
