# Changesets

Add a changeset for every adopter-facing package change:

```sh
npm run changeset
```

Use the summary as adopter-facing release notes. The release workflow turns
merged changesets into a version PR. When that PR is reviewed and merged, the
workflow publishes the npm package, Git tag, changelog, and GitHub Release.
