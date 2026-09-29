# Publishing the npm package

The Buildkite pipeline `pdf-to-markdown-npm-release` publishes
`@pspdfkit/pdf-to-markdown`. Native CLI builds, signing, and CDN publication
remain in the GdPicture release pipeline. The npm smoke test uses the native
CLI currently available from the production CDN.

## Start a release

1. Bump `package.json` to a new stable version and update `CHANGELOG.md` in a PR.
   Get an approval from a repository collaborator or organization member and
   merge it into `main`.
2. Wait for the **Validate** GitHub Actions workflow on the merge commit to pass
   on Linux and macOS.
3. In Buildkite, open **PDF to Markdown npm release**, select **New Build**, set
   branch to `main`, and paste the full merge commit SHA into **Commit**.
   Do not leave the commit as `HEAD`. There are no release environment variables
   to supply and no credentials to paste into the build form.
4. Review the release summary. It records the version, commit, and tarball
   integrity. Validation installs that tarball, downloads the native CLI, and
   checks account-command help, Standard Markdown/text conversion, and `query`.
   It uses no account or Vision credits.
5. Click **Publish tested package to npm**. The job publishes the tested tarball
   with `--access public --tag latest`, verifies the registry integrity, and
   creates `v<version>` at the release commit.

PRs, branch pushes, tags, and schedules do not start this pipeline. A merged PR
does not publish anything. Publication is serialized across release builds.
The pipeline does not change the package version or create a GitHub release page.

The initial pipeline PR does not require an npm release or a version bump. The
already-published `0.6.0` must not be republished from the pipeline merge commit.

## Retry an incomplete release

Retry the failed publish job in the same build. It downloads artifacts from
that build's `prepare-npm` step and checks their contents against the reviewed
source. If npm already has the same version and integrity, it skips publication
and finishes verification and Git tagging. It never overwrites an existing tag
or moves `latest` back from a newer release.

If the registry has different contents for that version, stop and prepare a
new version. If npm reports an authentication error, ask Infrastructure to check
the token's expiry, package permissions, and unattended-publishing permissions.
Do not put a replacement token in build logs or artifacts.

## One-time Buildkite setup

An Infrastructure administrator with cluster-management access needs to create
the pipeline with these settings:

- Name: **PDF to Markdown npm release**; slug: `pdf-to-markdown-npm-release`.
- Repository: `https://github.com/PSPDFKit/pdf-to-markdown.git`.
- Default branch and branch filter: `main`.
- Disable automatic branch, PR, fork, and tag builds. Do not create a webhook or
  schedule. Allow only trusted release maintainers to create or unblock builds.
- Use the same self-hosted cluster as `native-sdk-nutrient-cli-build`
  (`eb460858-edd3-4278-a34a-00d0802a54e3`) and Linux Docker agents in the `default`
  queue. The host needs `docker`, `git`, `buildkite-agent`, and authenticated `op`.
- Copy `.buildkite/bootstrap.yml` into the pipeline's initial configuration.
  It uploads the release steps only for manual `main` builds with no PR.

The runner uses the digest-pinned Node 24.14.1 Debian 13 (Trixie) image. The current
Linux ARM64 native CLI requires glibc 2.38 or newer; Debian 12 is too old for it.
The runner installs no npm dependencies from the registry; the install test
consumes the local tarball.
The project `.npmrc` sets a 15-day age requirement for registry dependencies.

Only the approved publish job reads the following secret references:

- `op://Infrastructure/npm - CI/pdf-to-markdown` becomes `NODE_AUTH_TOKEN`.
- `op://Developers/GITHUB_ACCESS_TOKEN/password` becomes `RELEASE_GITHUB_TOKEN`.

Confirm that the agent identity can read both fields. The npm token needs write
access to this package and permission to publish without an interactive 2FA
prompt. Record its expiry and renewal owner. The GitHub credential needs
permission to create tags in this repository. GitHub validation reads public
API endpoints without credentials and fails closed on rate limits or errors.

Credentials are passed as environment variables to the publish container.
Its temporary npm configuration contains an environment-variable reference,
not a literal token; it and the npm cache are removed when the job exits.
The preparation job and native smoke test receive neither publishing token.

## Validate changes without publishing

```sh
npm run check
npm test
node --test ci/release.test.mjs
shellcheck -s bash ci/npm-release.sh
bk pipeline validate --file .buildkite/pipeline.yml
bk pipeline validate --file .buildkite/bootstrap.yml
```

Tests cover release eligibility, PR reviews, exact-commit GitHub checks,
tarball contents, tag conflicts, registry failures, version ordering, and
retries after ambiguous publication or failed tagging. They do not read
1Password or write to npm, GitHub, or Buildkite.
