# Changesets Quick Start

## What Changed

Your monorepo is now configured to properly publish packages to npm with automatic `workspace:*` → semver conversion.

### Packages Now Published

✅ `@cossistant/types` - Shared TypeScript types (previously private)
✅ `@cossistant/core` - Core library (previously private)
✅ `@cossistant/react` - React SDK
✅ `@cossistant/next` - Next.js bindings

All 4 packages use **fixed versioning** (always the same version).

## Usage

### Basic Workflow

```bash
# 1. Make your changes, then create a changeset
bun changeset

# 2. Version packages (converts workspace:* to actual versions)
bun changeset:version

# 3. Review the changes
git diff

# 4. Commit everything
git add .
git commit -m "chore: version packages to v0.1.0"

# 5. Build and publish
bun run release

# 6. Push tags
git push --follow-tags
```

### Available Commands

| Command | Description |
|---------|-------------|
| `bun changeset` | Create a new changeset (describes what changed) |
| `bun changeset:version` | Update versions & convert workspace:* to semver |
| `bun run build` | Build all packages in dependency order |
| `bun changeset:publish` | Build & publish to npm |
| `bun run release` | Complete release (version → build → publish) |

## How Workspace Conversion Works

### Before `changeset:version`

```json
{
  "name": "@cossistant/react",
  "version": "0.0.6",
  "dependencies": {
    "@cossistant/core": "workspace:*",
    "@cossistant/types": "workspace:*"
  }
}
```

### After `changeset:version`

```json
{
  "name": "@cossistant/react",
  "version": "0.1.0",
  "dependencies": {
    "@cossistant/core": "0.1.0",
    "@cossistant/types": "0.1.0"
  }
}
```

This ensures that when someone runs `npm install @cossistant/react@0.1.0`, it properly resolves the dependencies from npm (not workspace protocol).

## Build Order

Turbo automatically builds packages in the right order:

1. `@cossistant/types` (no deps)
2. `@cossistant/core` (needs types)
3. `@cossistant/react` (needs core & types)
4. `@cossistant/next` (needs react)

## Publish Order

Changesets publishes in the same order, ensuring dependencies are available before dependent packages.

## Testing Before Publishing

```bash
# Build everything
bun run build

# Create a local tarball to test
cd packages/react
npm pack
# Creates: cossistant-react-0.1.0.tgz

# Install in another project
npm install /path/to/cossistant-react-0.1.0.tgz
```

## First-Time Setup (Already Done)

✅ Updated `.changeset/config.json`
✅ Made `@cossistant/core` and `@cossistant/types` public
✅ Added build scripts to core and types packages
✅ Created `tsconfig.build.json` for compilation
✅ Updated exports to point to `dist/` after build
✅ Added release scripts to root `package.json`

## Important Files

- `.changeset/config.json` - Changesets configuration
- `docs/CHANGESETS_WORKFLOW.md` - Detailed documentation
- `packages/*/tsconfig.build.json` - Build configurations
- Root `package.json` - Release scripts

## Need Help?

See `docs/CHANGESETS_WORKFLOW.md` for detailed documentation including:
- Troubleshooting guide
- CI/CD integration
- Best practices
- Configuration reference

## Example Release

```bash
# You make changes to the React package
vim packages/react/src/support/index.tsx

# Create a changeset
$ bun changeset
🦋  Which packages would you like to include?
◉ @cossistant/react
🦋  What kind of change is this?
❯ minor
🦋  Summary: Added new notification component

# Commit the changeset
git add .changeset/*.md
git commit -m "feat: add notification component"

# When ready to release
bun changeset:version
# ✅ All 4 packages bumped to 0.1.0
# ✅ workspace:* converted to 0.1.0

git add .
git commit -m "chore: version packages to v0.1.0"
git push

# Publish
bun run release
# ✅ Builds all packages
# ✅ Publishes to npm in order

git push --follow-tags
# ✅ Pushes version tags
```

## Next Steps

1. Make your changes
2. Run `bun changeset` to document them
3. When ready, run `bun changeset:version`
4. Review, commit, and run `bun run release`

That's it! 🎉

