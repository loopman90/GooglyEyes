# Versioning

GooglyEyes uses SemVer and Git tags.

## Rules

- `manifest.json`, `package.json`, `versions.json`, and `CHANGELOG.md` must agree on the released version.
- GitHub release tags must not use a `v` prefix. Use `1.0.0`, not `v1.0.0`.
- The release tag must point at the commit that contains the matching `manifest.json` version.
- Obsidian release assets should be only `main.js`, `manifest.json`, and `styles.css`.
- Keep generated test builds under `release/googly-eyes-test`; do not commit `release/`.

## Release Checklist

1. Update `manifest.json` and `package.json`.
2. Update `versions.json`.
3. Update `CHANGELOG.md`.
4. Run `npm run version:check`.
5. Run `npm run validate-assets`.
6. Run `npm run build`.
7. Commit the release changes.
8. Tag the commit with the exact version, for example `git tag 1.0.0`.
9. Push `main` and the tag.
10. Create or update the GitHub release with only `main.js`, `manifest.json`, and `styles.css`.
