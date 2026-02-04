# Task Plan: Custom Mouth Renderer & Eye Blinking

## Goal
Add two new features to the Facehash component:
1. **Custom Mouth Renderer** (`onRenderMouth`) - Allow users to render a custom mouth instead of the initial letter
2. **Eye Blinking Effect** (`enableBlink`) - Random, chaotic CSS-only eye blinking animation

## Key Requirements
1. `onRenderMouth` render prop to replace the initial letter with custom content (e.g., a spinner)
2. Eye blinking effect should be:
   - Pure CSS (no JS timers)
   - Random and chaotic (different timing per eye)
   - Optional via `enableBlink` prop
3. Update documentation (README.md)

## Current Architecture Understanding
- **Eyes** are rendered by `FaceComponent` (RoundFace, CrossFace, LineFace, CurvedFace)
- **Mouth** area is currently the initial letter (`showInitial` prop)
- The `onRenderMouth` should allow replacing this area entirely

## Phases

### Phase 1: Add onRenderMouth Prop ✅ `complete`
- [x] Add `onRenderMouth?: () => React.ReactNode` prop to FacehashProps
- [x] Replace the initial letter rendering with conditional: `onRenderMouth?.() ?? initial`
- [x] When `onRenderMouth` is provided, it takes precedence over `showInitial`
- [x] Export the type from index.ts

### Phase 2: Add Eye Blinking CSS Animation ✅ `complete`
- [x] Create CSS keyframes for blinking (scaleY animation)
- [x] Add `enableBlink?: boolean` prop to FacehashProps
- [x] Apply random animation delays to each eye (left/right)
- [x] Use CSS custom properties or inline styles for randomness
- [x] Blinking should be chaotic: different durations, delays per eye

### Phase 3: Update faces.tsx for Individual Eye Control ✅ `complete`
- [x] Modify face components to allow wrapping each eye separately
- [x] Enable applying different animations to left vs right eye
- [x] Keep backward compatibility with existing API

### Phase 4: Update Documentation ✅ `complete`
- [x] Add `onRenderMouth` section to README
- [x] Add `enableBlink` section to README
- [x] Add example using Spinner as mouth
- [x] Update Props table

### Phase 5: Test & Validate ✅ `complete`
- [x] Build passes
- [x] TypeScript check passes

## API Design

### New Props
```typescript
interface FacehashProps {
  // ... existing props ...

  /**
   * Custom mouth renderer. When provided, replaces the initial letter.
   * Useful for showing loading spinners, custom icons, etc.
   */
  onRenderMouth?: () => React.ReactNode;

  /**
   * Enable random eye blinking animation.
   * Pure CSS, different timing per eye for chaotic effect.
   * @default false
   */
  enableBlink?: boolean;
}
```

### Usage Examples
```tsx
// Custom mouth with spinner
<Facehash
  name="loading"
  onRenderMouth={() => <Spinner size={16} />}
/>

// Eye blinking
<Facehash name="alive" enableBlink />

// Both
<Facehash
  name="bot"
  enableBlink
  onRenderMouth={() => <BotIcon size={12} />}
/>
```

## CSS Animation Strategy for Blinking

Use CSS keyframes with random delays injected via inline styles:
```css
@keyframes facehash-blink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}
```

Each eye gets a different random delay (2-6s) and duration (0.1-0.2s for blink).
Use `Math.random()` seeded by hash to make it deterministic per name but different per eye.

## Technical Considerations

### Face Component Refactoring
Current faces render both eyes in a single SVG. For individual eye animation, we have two options:
1. **Wrapper approach**: Wrap each path in a `<g>` element with its own animation
2. **Split SVG approach**: Render each eye as separate SVG (more complex)

Going with option 1 (wrapper approach) for simplicity.

## Files to Modify
- `src/facehash.tsx` - Add new props and rendering logic
- `src/faces.tsx` - Possibly add wrappers for individual eye animation
- `README.md` - Update documentation

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |
