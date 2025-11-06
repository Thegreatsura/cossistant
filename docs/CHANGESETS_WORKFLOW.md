# Changesets Workflow Guide

This guide explains how to use Changesets to manage versions and publish packages to npm.

## Overview

The monorepo uses Changesets to:
- Track changes across multiple packages
- Automatically version packages using semver
- Convert `workspace:*` dependencies to proper semver versions
- Publish packages to npm in the correct dependency order

## Published Packages

The following packages are published to npm:
- `@cossistant/types` - Shared TypeScript types
- `@cossistant/core` - Core library for API and data fetching
- `@cossistant/react` - React SDK with hooks and primitives (depends on core & types)
- `@cossistant/next` - Next.js bindings (depends on react)

All packages use **fixed versioning** - they always have the same version number.

## Workflow

### 1. Create a Changeset

When you make changes to any publishable package, create a changeset:

```bash
bun changeset
```

This will:
- Prompt you to select which packages changed
- Ask for the type of change (patch/minor/major)
- Request a summary of the changes
- Create a markdown file in `.changeset/`

**Example:**
```bash
$ bun changeset
🦋  Which packages would you like to include?
◉ @cossistant/core
◉ @cossistant/react
◯ @cossistant/next
◯ @cossistant/types

🦋  What kind of change is this for the selected packages?
  patch (0.0.6 → 0.0.7)
❯ minor (0.0.6 → 0.1.0)
  major (0.0.6 → 1.0.0)

🦋  Please enter a summary for this change:
Add new authentication hooks and improve error handling
```

### 2. Commit the Changeset

Commit the generated changeset file:

```bash
git add .changeset/*.md
git commit -m "feat: add authentication hooks"
```

### 3. Version Packages

When you're ready to release, run:

```bash
bun changeset:version
```

This will:
- Read all changeset files in `.changeset/`
- Update package versions in `package.json` files
- Convert `workspace:*` to actual versions (e.g., `"@cossistant/core": "0.1.0"`)
- Update or create `CHANGELOG.md` files
- Delete consumed changeset files

**Example changes:**
```diff
# packages/react/package.json
{
  "name": "@cossistant/react",
- "version": "0.0.6",
+ "version": "0.1.0",
  "dependencies": {
-   "@cossistant/core": "workspace:*",
-   "@cossistant/types": "workspace:*",
+   "@cossistant/core": "0.1.0",
+   "@cossistant/types": "0.1.0",
  }
}
```

### 4. Review Changes

Always review the changes before publishing:

```bash
git diff
```

Check:
- Version numbers are correct
- `workspace:*` references are converted
- CHANGELOG.md files are updated properly

### 5. Commit Version Changes

Commit the version bump changes:

```bash
git add .
git commit -m "chore: version packages"
git push
```

### 6. Build All Packages

Build all packages before publishing:

```bash
bun run build
```

This will build packages in the correct order:
1. `@cossistant/types` (no dependencies)
2. `@cossistant/core` (depends on types)
3. `@cossistant/react` (depends on core & types)
4. `@cossistant/next` (depends on react)

### 7. Publish to npm

Publish all packages:

```bash
bun changeset:publish
```

Or use the combined release command:

```bash
bun run release
```

This will:
- Build all packages (`bun run build`)
- Publish packages to npm in dependency order
- Create git tags for the published versions

### 8. Push Tags

After publishing, push the git tags:

```bash
git push --follow-tags
```

## Quick Reference

```bash
# Complete release workflow
bun changeset                  # Create changeset
git add .changeset/*.md        # Stage changeset
git commit -m "feat: ..."      # Commit changeset
bun changeset:version          # Update versions
git diff                       # Review changes
git add .                      # Stage version changes
git commit -m "chore: version" # Commit versions
bun run release                # Build & publish
git push --follow-tags         # Push to remote
```

## Alternative: Separate Build and Publish

If you prefer more control:

```bash
bun changeset:version          # Update versions
git add . && git commit -m "chore: version packages"
bun run build                  # Build all packages
bun changeset:publish          # Publish to npm
git push --follow-tags         # Push tags
```

## How It Works

### Workspace Protocol Conversion

Changesets automatically converts `workspace:*` to proper semver versions:

**Before `changeset version`:**
```json
{
  "dependencies": {
    "@cossistant/core": "workspace:*"
  }
}
```

**After `changeset version`:**
```json
{
  "dependencies": {
    "@cossistant/core": "0.1.0"
  }
}
```

### Fixed Versioning

All packages in the `fixed` group (defined in `.changeset/config.json`) are versioned together:

```json
{
  "fixed": [
    [
      "@cossistant/core",
      "@cossistant/react",
      "@cossistant/types",
      "@cossistant/next"
    ]
  ]
}
```

This means:
- If you bump one package, all packages get bumped
- All packages always have the same version
- Simplifies dependency management

### Build Order

Turbo ensures packages are built in dependency order using the `^build` dependency:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

### Publish Order

Changesets publishes packages in topological order:
1. Packages with no internal dependencies first (`@cossistant/types`)
2. Packages that depend on those next (`@cossistant/core`)
3. And so on (`@cossistant/react`, then `@cossistant/next`)

This ensures that when `@cossistant/react` is published, `@cossistant/core` is already available on npm.

## Troubleshooting

### "workspace:* dependency not found" after npm install

This means `changeset version` wasn't run before publishing. Always run:

```bash
bun changeset:version
```

Before building and publishing.

### Build fails with "Cannot find module @cossistant/core"

During development, packages reference `./src/index.ts`. After building, they reference `./dist/index.js`.

Make sure you've run `bun run build` before testing published packages locally.

### Publishing fails with "You need to be logged in"

Login to npm:

```bash
npm login
```

### Want to test the package locally before publishing?

Use `npm pack` to create a tarball:

```bash
cd packages/react
bun run build
npm pack
```

Then install it in another project:

```bash
npm install /path/to/cossistant-react-0.1.0.tgz
```

## Configuration Files

### `.changeset/config.json`

Main Changesets configuration:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [["@cossistant/core", "@cossistant/react", "@cossistant/types", "@cossistant/next"]],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "minor",
  "ignore": ["@cossistant/api", "@cossistant/web", "@cossistant/location", "@cossistant/transactional"]
}
```

Key settings:
- `commit: false` - Manual commits for better control
- `fixed` - Packages that version together
- `updateInternalDependencies: "minor"` - Bump internal deps on minor changes
- `ignore` - Packages to exclude from versioning

### Package Build Configs

Each publishable package has:

**`tsconfig.build.json`** - Build-specific TypeScript config:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["**/*.test.ts", "dist", "node_modules"]
}
```

**`package.json`** - Build script:
```json
{
  "scripts": {
    "build": "tsc --project tsconfig.build.json"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

## Best Practices

1. **Always create changesets for user-facing changes** - Internal refactors might not need them
2. **Review version changes** - Use `git diff` after `changeset version`
3. **Test builds locally** - Run `bun run build` before publishing
4. **Use semantic versioning correctly**:
   - `patch`: Bug fixes, no API changes
   - `minor`: New features, backward compatible
   - `major`: Breaking changes
5. **Keep changeset summaries clear** - They become changelog entries
6. **Commit changesets separately** - Makes history cleaner
7. **Push tags after publishing** - Enables GitHub releases

## CI/CD Integration (Future)

To automate releases with GitHub Actions:

```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: bun run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

This will:
- Automatically create PRs for version bumps
- Publish to npm when the PR is merged

