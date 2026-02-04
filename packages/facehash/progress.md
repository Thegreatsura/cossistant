# Progress Log: Facehash Package

## Session: 2026-02-04 - Custom Mouth Renderer & Eye Blinking

### Features Implemented
- [x] Added `onRenderMouth` prop for custom mouth/content rendering
- [x] Added `enableBlink` prop for random eye blinking animation
- [x] Pure CSS blink animation with chaotic timing per eye
- [x] Updated all face components (RoundFace, CrossFace, LineFace, CurvedFace)
- [x] Updated README documentation with examples

### Files Modified
- `src/facehash.tsx` - Added new props and rendering logic
- `src/faces.tsx` - Added blink animation support with `<g>` wrappers
- `README.md` - Added documentation for new features
- `apps/facehash-landing/src/components/props-examples.tsx` - Added demos for new features

### Technical Details
- Blink animation uses CSS keyframes injected once into document head
- Each eye has different delay (0-5s) and duration (2-7s) for chaotic effect
- Timings are deterministic based on name hash (same name = same timing)
- `onRenderMouth` takes precedence over `showInitial` when provided

### Build & Type Check
- ✅ TypeScript check passes
- ✅ Build passes

---

## Session: 2026-01-30

### 10:00 - Research & Planning
- [x] Read current facehash library structure
- [x] Analyzed `facehash.tsx` for face generation logic
- [x] Read `faces.tsx` for SVG components
- [x] Read `utils/hash.ts` and `utils/colors.ts`
- [x] Researched Next.js ImageResponse API
- [x] Researched Next.js route handlers (App Router)
- [x] Analyzed Better Auth's `toNextJsHandler` pattern
- [x] Created task_plan.md
- [x] Created findings.md

### Key Findings
1. Face generation is deterministic: `stringHash(name) % FACES.length`
2. ImageResponse uses Satori under the hood - flexbox only
3. Better Auth pattern: `export const { GET } = toHandler(options)`
4. `next/og` is bundled with Next.js - no extra install

### Implementation Complete
- [x] All 5 phases completed successfully

---

## Completed Phases
1. ✅ Extract Core Logic - `src/core/facehash-data.ts`
2. ✅ Create Static Image Component - `src/next/image.tsx` + `src/next/faces-svg.ts`
3. ✅ Build Route Handler Factory - `src/next/handler.tsx`
4. ✅ Configure Package Exports - `package.json` + `tsdown.config.ts`
5. ✅ Test & Validate - Test route created in facehash-landing app

## Files Created
- `src/core/facehash-data.ts` - Pure functions for face computation
- `src/core/index.ts` - Core module exports
- `src/next/faces-svg.ts` - SVG path data for ImageResponse
- `src/next/image.tsx` - Satori-compatible JSX component
- `src/next/handler.tsx` - Route handler factory
- `src/next/index.ts` - Next.js module exports
- `apps/facehash-landing/src/app/api/avatar/route.ts` - Test route

## Files Modified
- `package.json` - Added `./next` export, Next.js peer dependency
- `tsdown.config.ts` - Added new entry point

## Test Results
- TypeScript check: ✅ PASS
- Build: ✅ PASS (both facehash package and facehash-landing app)
- Route detection: ✅ `/api/avatar` correctly shows as dynamic function route
