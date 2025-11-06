# Release Playbook

Quick reference for releasing SDK packages using Changesets.

## Stable Release Workflow

```bash
# 1. Create a changeset
bun changeset

# 2. Version packages (converts workspace:* to semver)
bun changeset:version

# 3. Review and commit
git diff
git add .
git commit -m "chore: version packages"
git push

# 4. Build and publish
bun run release

# 5. Push tags
git push --follow-tags
```

## Published Packages

All packages use **fixed versioning** (same version number):

- `@cossistant/types` - TypeScript types
- `@cossistant/core` - Core library
- `@cossistant/react` - React SDK
- `@cossistant/next` - Next.js bindings

## Quick Commands

| Command | Description |
|---------|-------------|
| `bun changeset` | Create a changeset |
| `bun changeset:version` | Update versions & convert workspace:* |
| `bun run build` | Build all packages |
| `bun changeset:publish` | Build & publish to npm |
| `bun run release` | Complete release (version → build → publish) |

## Beta Builds (CI)

1. Open a PR targeting `main`
2. Apply the `🚀 autorelease` label
3. Wait for **Release - Beta** workflow to complete
4. Install with: `bun add @cossistant/react@0.0.0-beta.<sha>`

## Prerequisites

- Run `bun install` to ensure dependencies are installed
- Login to npm: `npm login`
- Have push access to `main` branch

## Detailed Documentation

See [CHANGESETS_QUICKSTART.md](./CHANGESETS_QUICKSTART.md) for quick start guide.

See [docs/CHANGESETS_WORKFLOW.md](./docs/CHANGESETS_WORKFLOW.md) for detailed documentation.
