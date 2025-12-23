# Release Workflow

## For Contributors

1. Make your changes
2. Run `bun changeset` and describe what changed
3. Commit the changeset file with your PR
4. Merge to main

## What Happens Automatically

When PRs with changesets merge to main:

1. A "Version Packages" PR is created/updated automatically
2. When the Version PR is merged, packages publish to npm
3. GitHub releases are created with changelogs

## Using the Release CLI

For maintainers, we provide an AI-powered release CLI:

```bash
bun release create
```

This interactive tool will:

1. Ask you to select a release type (patch/minor/major)
2. Ask for a description of the changes
3. Fetch git commits since the last release
4. Generate a polished changelog using AI
5. Let you refine the changelog until you're satisfied
6. Create the changeset, version packages, and publish to npm

## Published Packages

All packages use **fixed versioning** (same version number):

- `@cossistant/types` - TypeScript types
- `@cossistant/core` - Core library
- `@cossistant/react` - React SDK
- `@cossistant/next` - Next.js bindings

## Prerequisites

- Run `bun install` to ensure dependencies are installed
- Login to npm: `npm login`
- Have push access to `main` branch
- Set `OPENROUTER_API_KEY` environment variable for the release CLI
