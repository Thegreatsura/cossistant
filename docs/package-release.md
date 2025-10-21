# Package Release Playbook

This guide documents the release flow for the public SDK packages published from this monorepo: `@cossistant/react` and `@cossistant/next`.

## Prerequisites

- Run `bun install --workspaces` to ensure dependencies are present.
- Authenticate with the npm registry. Either:
  - Have an `.npmrc` file with a valid `//registry.npmjs.org/:_authToken=...`, or
  - Run `npm login` with the account that owns the `@cossistant` scope.
- Ensure you have push access to the `main` branch and permission to create GitHub releases and tags.

## 1. Generate a Changeset

1. Checkout a new branch for the release work: `git switch -c chore/release-react-next`.
2. Run `bun run changeset` and select the packages to release. Only choose:
   - `@cossistant/react`
   - `@cossistant/next`
3. Choose the appropriate version bump (typically `minor` for feature releases, `patch` for fixes).
4. Write a concise summary of the changes. This drives the npm changelog and GitHub release notes.

The command creates a file inside `.changeset/`. Commit it with the rest of the release artifacts later.

## 2. Categorise the Work

Before versioning, collect the merged work since the previous release:

```bash
git fetch --tags
LAST_TAG=$(git describe --tags --abbrev=0 --match "@cossistant/react@*" 2>/dev/null || git rev-list --max-parents=0 HEAD)
git log --oneline "${LAST_TAG}..HEAD" -- packages/react packages/next
```

Use this output to group updates into two buckets:

- **Widget updates** – anything user-facing in the embedded support widget.
- **Dashboard updates** – any improvements to the operator dashboard experience.

These categories power the web changelog entry (see step 5).

## 3. Version the Packages

1. Run the build locally before versioning:
   ```bash
   bunx turbo run build --filter=@cossistant/react --filter=@cossistant/next
   ```
2. Apply the version bumps and changelog updates:
   ```bash
   bun run version-packages
   ```
   This updates `package.json` files, changelog entries inside `.changeset`, and creates a release commit.

## 4. Tag the Release

Create git tags for each package. Example for version `0.1.0`:

```bash
git tag @cossistant/react@0.1.0
git tag @cossistant/next@0.1.0
```

Push the tags after verifying the release branch is ready: `git push --follow-tags`.

## 5. Publish the Web Changelog Entry

Create an MDX file under `apps/web/content/changelog/` with frontmatter matching the schema in `apps/web/source.config.ts`. Use the widget vs. dashboard breakdown gathered earlier. Follow the template enforced by the Cursor release rule (`.cursor/rules/package-release.mdc`).

Commit the new MDX file alongside the version bumps.

## 6. Publish to npm

Dry-run publishing first:

```bash
bun run release -- --access public --dry-run
```

If everything looks correct, publish:

```bash
bun run release -- --access public
```

Verify the packages appear on npm with the new version.

## 7. Finalise on GitHub

1. Push the release branch and open a PR summarising the changes and linking to the MDX changelog entry.
2. Once merged, push the tags if you have not already (`git push origin @cossistant/react@0.1.0 @cossistant/next@0.1.0`).
3. Create a GitHub release for each tag. Copy the Changeset summary and link to the website changelog entry for reference.

## Troubleshooting

- If `changeset publish` fails with `ENEEDAUTH`, double-check your npm token scope.
- If Turbo caches stale builds, run `bunx turbo run build --filter=@cossistant/react --filter=@cossistant/next --force`.
- The `dist/` folders are the only published artifacts. Ensure build outputs exist before publishing.

Keep this playbook updated as the release automation evolves.
