---
"@cossistant/react": minor
"@cossistant/next": minor
---

Remove the `tailwind.css` subpath export from both SDK packages.

This is a breaking change:
- Tailwind source integration must use `support.css`
- Non-Tailwind or precompiled fallback usage must use `styles.css`

Migration:
- `@cossistant/react/tailwind.css` -> `@cossistant/react/support.css` or `@cossistant/react/styles.css`
- `@cossistant/next/tailwind.css` -> `@cossistant/next/support.css` or `@cossistant/next/styles.css`
