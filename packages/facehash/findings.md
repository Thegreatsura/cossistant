# Findings: Facehash Color Styling Issue

## Key Discovery

### SVG uses `currentColor`
All face SVGs use `fill="currentColor"` (faces.tsx lines 79, 86, 120, 127, etc.)
This means the SVG inherits the `color` CSS property from its parent.

### Current Problem
In facehash.tsx line 335:
```tsx
<div
  data-facehash-face=""
  style={{
    ...
    color: "#000000",  // <-- INLINE STYLE - CANNOT BE OVERRIDDEN BY CSS
  }}
>
```

### CSS Specificity Rules
1. Inline styles: specificity 1,0,0,0
2. ID selectors: specificity 0,1,0,0
3. Class/attribute selectors: specificity 0,0,1,0
4. Element selectors: specificity 0,0,0,1

**Inline styles ALWAYS win** (except `!important`)

## Solution: CSS Custom Properties

CSS custom properties (variables) can be set on parent elements and used in inline styles:

```tsx
// In component:
style={{
  color: "var(--facehash-color, #000000)"
}}

// User overrides via CSS or Tailwind:
[data-facehash] {
  --facehash-color: hsl(var(--primary) / 0.1);
}
```

**Why this works:**
- The inline style uses a variable with a default fallback
- The variable can be set from ANY CSS selector targeting the element or its ancestors
- No specificity battle - variables cascade naturally

## Tailwind Usage
With CSS variables, users can use Tailwind's arbitrary properties:
```tsx
<Facehash className="[--facehash-color:theme(colors.primary/0.1)]" />
```

Or in global CSS:
```css
[data-facehash] {
  --facehash-color: theme('colors.primary / 0.1');
}
```

## Implementation Plan
1. Change `color: "#000000"` to `color: "var(--facehash-color, #000000)"`
2. Change `fontFamily: "monospace"` to `fontFamily: "var(--facehash-font-family, monospace)"`
3. Change `fontWeight: "bold"` to `fontWeight: "var(--facehash-font-weight, bold)"`
4. Document the CSS variables for users
