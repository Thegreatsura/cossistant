# Task Plan: Next.js Route Handler Adapter for Facehash

## Goal
Add a Next.js route handler adapter to the `facehash` library that generates PNG images of facehash avatars. Users can export `{ GET }` from `facehash/next` in their `app/api/avatar/route.ts` and get a working image endpoint.

## Key Requirements
1. **Tree-shakable**: Everything Next.js-related lives in `facehash/next` - core library remains framework-agnostic
2. **Next.js 15/16 only**: App Router with route handlers, no legacy support
3. **400x400 default**: Image dimensions default to 400px square
4. **Same params as React component**: Accept `name`, `size`, `variant`, `intensity3d`, `showInitial`, `colors`
5. **Fully typed**: TypeScript with proper generics
6. **Easy API**: Follow Better Auth's pattern: `export const { GET } = toFacehashHandler(options?)`

## Architecture

```
packages/facehash/
├── src/
│   ├── index.ts              # Main entry (unchanged)
│   ├── next/
│   │   ├── index.ts          # Entry for facehash/next
│   │   ├── handler.ts        # Route handler factory
│   │   └── image.tsx         # ImageResponse JSX component
│   ├── core/
│   │   └── facehash-data.ts  # Shared logic for computing face properties
│   └── ...existing files
├── package.json              # Add exports for ./next
└── tsdown.config.ts          # Add entry for next
```

## Phases

### Phase 1: Extract Core Logic ✅ `complete`
- [x] Create `src/core/facehash-data.ts` with pure functions
- [x] Extract hash-based computation (face selection, color index, rotation)
- [x] No React dependencies in core module
- [x] Export types: `FacehashData`, `FacehashOptions`

### Phase 2: Create Static Image Component ✅ `complete`
- [x] Create `src/next/image.tsx` - JSX for ImageResponse
- [x] Render face SVG inline via `faces-svg.ts`
- [x] Use inline styles only (flexbox, no grid)
- [x] Satori-compatible CSS

### Phase 3: Build Route Handler Factory ✅ `complete`
- [x] Create `src/next/handler.tsx`
- [x] Implement `toFacehashHandler(options?)` function
- [x] Parse search params: `name`, `size`, `variant`, `showInitial`, `colors`
- [x] Return `{ GET }` object for destructuring export
- [x] Full TypeScript types with JSDoc

### Phase 4: Configure Package Exports ✅ `complete`
- [x] Update `package.json` with `./next` export
- [x] Update `tsdown.config.ts` with new entry point
- [x] Mark `next`, `next/og`, `next/server` as external
- [x] Next.js as optional peer dependency (>=15)

### Phase 5: Test & Validate ✅ `complete`
- [x] Create test route in `apps/facehash-landing/src/app/api/avatar/route.ts`
- [x] Build passes successfully
- [x] Route handler correctly detected as dynamic function route

## API Design

### User-facing API
```typescript
// app/api/avatar/route.ts
import { toFacehashHandler } from "facehash/next";

export const { GET } = toFacehashHandler({
  // Optional defaults (all overridable via query params)
  size: 400,
  variant: "gradient",
  colors: ["#ec4899", "#f59e0b", "#3b82f6"],
});
```

### Query Parameters
```
GET /api/avatar?name=john
GET /api/avatar?name=john&size=200
GET /api/avatar?name=john&variant=solid&showInitial=false
GET /api/avatar?name=john&colors=#ff0000,#00ff00,#0000ff
```

### Handler Options Type
```typescript
interface FacehashHandlerOptions {
  size?: number;              // Default: 400
  variant?: "gradient" | "solid";
  showInitial?: boolean;      // Default: true
  colors?: string[];          // Default: library defaults
  cacheControl?: string;      // Default: "public, max-age=31536000, immutable"
}
```

## Technical Notes

### ImageResponse Constraints
- Only flexbox layouts (no CSS grid)
- Subset of CSS properties
- 500KB bundle limit
- Font formats: ttf, otf, woff only
- Uses Satori + Resvg under the hood

### Face SVGs
Need to inline SVG paths directly in JSX (not use React components). The face components return JSX which should work, but may need adjustment for Satori compatibility.

### Colors in Query String
Parse comma-separated hex colors: `?colors=#ec4899,#f59e0b`

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |

## Files to Create/Modify
- `src/core/facehash-data.ts` - NEW
- `src/next/index.ts` - NEW
- `src/next/handler.ts` - NEW
- `src/next/image.tsx` - NEW
- `package.json` - MODIFY
- `tsdown.config.ts` - MODIFY

## References
- [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Better Auth Next.js Integration](https://www.better-auth.com/docs/integrations/next)
- [Satori CSS Support](https://github.com/vercel/satori#css)
