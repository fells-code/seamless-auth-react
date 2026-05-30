# Release Management

This repo uses npm plus Changesets.

## Daily Development

1. Make the code change.
2. Run `npm run changeset`.
3. Select `@seamless-auth/react`.
4. Choose the semver bump.
5. Write release notes for SDK adopters, not implementation notes.

## Stable Releases

Stable releases come from `main` through the `Release` workflow.

When changesets are merged to `main`, the workflow opens or updates a release PR that contains:

- the package version bump
- `CHANGELOG.md` updates
- `package-lock.json` updates
- consumed changeset file removals

Review that PR like a normal release artifact. When it is merged, the workflow publishes the npm
package, creates the Git tag, and creates the GitHub Release.

## npm Publishing

The workflow publishes with `NPM_CONFIG_PROVENANCE=true`, so npm records provenance for the package.
Configure the `NPM_TOKEN` repository secret with publish access before merging the first release PR.
