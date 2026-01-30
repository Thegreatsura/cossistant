# Findings: Facehash Next.js Route Handler

## Current Library Structure

### Main Exports (`src/index.ts`)
- `Facehash` - Main React component
- `FacehashProps`, `Intensity3D`, `Variant` - Types
- Avatar compound components: `Avatar`, `AvatarFallback`, `AvatarImage`
- Face components: `RoundFace`, `CrossFace`, `LineFace`, `CurvedFace`, `FACES`
- Utility: `stringHash`

### Face Generation Logic
Located in `src/facehash.tsx`:
1. Hash name using `stringHash(name)`
2. Select face: `hash % FACES.length`
3. Select color: `hash % colorsLength`
4. Select rotation: `hash % SPHERE_POSITIONS.length`

**SPHERE_POSITIONS** (9 positions):
```javascript
{ x: -1, y: 1 },  // down-right
{ x: 1, y: 1 },   // up-right
{ x: 1, y: 0 },   // up
{ x: 0, y: 1 },   // right
{ x: -1, y: 0 },  // down
{ x: 0, y: 0 },   // center
{ x: 0, y: -1 },  // left
{ x: -1, y: -1 }, // down-left
{ x: 1, y: -1 },  // up-left
```

### Face SVG Viewboxes
- RoundFace: `viewBox="0 0 63 15"`
- CrossFace: `viewBox="0 0 71 23"`
- LineFace: `viewBox="0 0 82 8"`
- CurvedFace: `viewBox="0 0 63 9"`

### Default Colors (from `src/utils/colors.ts`)
```javascript
DEFAULT_COLORS = ["#ec4899", "#f59e0b", "#3b82f6", "#f97316", "#10b981"]
```

## ImageResponse Requirements

### Import
```typescript
import { ImageResponse } from "next/og";
```
Note: `next/og` is bundled with Next.js, no separate install needed.

### Constructor
```typescript
new ImageResponse(element: ReactElement, {
  width?: number,   // default: 1200
  height?: number,  // default: 630
  emoji?: string,
  fonts?: FontConfig[],
  debug?: boolean,
  status?: number,
  statusText?: string,
  headers?: Record<string, string>
})
```

### CSS Limitations (Satori)
- ✅ Flexbox (`display: flex`)
- ✅ Absolute positioning
- ✅ Basic text styling
- ✅ Background colors
- ✅ Borders, border-radius
- ✅ SVG embedding
- ❌ CSS Grid
- ❌ CSS transforms (limited)
- ❌ Animations
- ❌ Pseudo-elements

### Bundle Size Limit
500KB including JSX, CSS, fonts, images, assets

## Better Auth Pattern Analysis

From `@better-auth/next`:
```typescript
// User code:
export const { GET, POST } = toNextJsHandler(auth);
```

Pattern:
1. Factory function returns object with HTTP method handlers
2. Destructuring export matches Next.js route handler convention
3. Options/config passed to factory function

## Route Handler Pattern (Next.js 15/16)

```typescript
// app/api/route.ts
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");

  return new Response(/* ... */);
}
```

## Design Decisions

### 1. Entry Point Structure
```
facehash/next → src/next/index.ts
```
Separate entry keeps Next.js deps isolated.

### 2. Handler Signature
```typescript
export function toFacehashHandler(options?: FacehashHandlerOptions): {
  GET: (request: NextRequest) => Promise<ImageResponse>;
}
```

### 3. Query Parameter Handling
- `name` - Required, the hash seed
- `size` - Optional, number (default: 400)
- `variant` - Optional, "gradient" | "solid"
- `showInitial` - Optional, boolean as string
- `colors` - Optional, comma-separated hex colors

### 4. Static vs Dynamic Rendering
For static image generation, we don't need 3D transforms or hover states.
Render the face at a fixed rotation angle.

### 5. Cache Headers
Default aggressive caching since same name = same image:
```
Cache-Control: public, max-age=31536000, immutable
```

## Open Questions
1. ~~Should we support custom fonts?~~ → No, keep it simple
2. ~~Edge runtime by default?~~ → Optional, user can add `export const runtime = 'edge'`
3. How to handle missing `name` param? → Return 400 Bad Request
