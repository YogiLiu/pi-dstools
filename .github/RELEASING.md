# Releasing

Releases are created automatically from Conventional Commits merged into `main`.
Do not hand-edit version numbers or changelogs in `packages/*`.

## One-time setup

1. Add a GitHub token with write access to this repository as the
   `RELEASE_TOKEN` repository secret. The built-in `GITHUB_TOKEN` cannot start a
   second workflow, so a separate token is required.
2. On npmjs.com, add a trusted publisher for every publishable package under
   `packages/`:
   - Provider: GitHub Actions
   - Organization or user: `YogiLiu`
   - Repository: `pi-dstools`
   - Workflow filename: the filename of `.github/workflows/publish.yml`
   - Environment name: leave empty
   - Allowed actions: enable `npm publish` in addition to `npm stage publish`
3. A trusted publisher configuration must see its first successful publish
   within two days. If it expires, delete it and add it again.
4. Package names that have never been published need a one-time bootstrap
   publish with a granular access token before a trusted publisher can be added.
   Revoke that token afterwards.
5. After trusted publishing works, set each package's publishing access to
   "Require two-factor authentication and disallow tokens" on npmjs.com.

## Useful commands

```bash
gh secret list
gh run list --workflow=release.yml
gh run list --workflow=publish.yml
gh release list
```
