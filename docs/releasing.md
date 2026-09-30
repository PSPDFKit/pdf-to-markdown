# Publishing the npm package

The manual Buildkite pipeline `pdf-to-markdown-npm-release` publishes
`@pspdfkit/pdf-to-markdown`. Native CLI builds, signing, and CDN publication
stay in the GdPicture pipeline.

## Start a release

1. Merge the version bump and changelog into `main` through the normal PR process.
2. Open **PDF to Markdown npm release** in Buildkite. Start a build on `main`
   with the full commit SHA you want to release.

Starting the build authorizes publication. There is no second approval step.
The pipeline tests and packs the selected commit, then installs the tarball
and exercises all four commands against the native CLI on the production CDN.
The smoke test uses Standard conversion and needs no account or Vision credits.
A separate job publishes the tested tarball as `latest`, verifies its registry
integrity, and creates `v<version>` at the selected commit.

The build annotation records the version, commit, and tarball integrity.
The pipeline does not bump versions or create a GitHub release page.
PRs and pushes do not start a release.

## Retry an incomplete release

Retry the failed publish job in the original build. If npm already has the same
version and integrity, the job skips publication and finishes verification and
tagging. Registry propagation can take time; a verification timeout does not
mean the publish failed. Check the job output before changing the version.

Different contents under the same version, a tag pointing at another commit,
or a new publication that would move `latest` backwards stops the job.
It never overwrites a tag. Publish jobs run one at a time across builds.
The daily GitHub release-tag check reports publications left without a tag.

## One-time Buildkite setup

Infrastructure needs to create the pipeline and confirm secret access:

- Name: **PDF to Markdown npm release**; slug: `pdf-to-markdown-npm-release`.
- Repository: `https://github.com/PSPDFKit/pdf-to-markdown.git`; branch: `main`.
- Disable automatic branch, PR, fork, and tag builds, webhooks, and schedules.
  Restrict build creation and pipeline editing to release maintainers.
- Copy `.buildkite/bootstrap.yml` into Buildkite's initial pipeline configuration.
  Do not replace it with a command that uploads that file from the checkout.
  The stored bootstrap checks that the selected commit belongs to `main` before
  loading repository-defined steps. Its dollar signs are for the job's shell;
  this file is copied into Buildkite, not interpolated by `pipeline upload`.
- Use Linux Docker agents in the same cluster as `native-sdk-nutrient-cli-build`.
  The YAML uses `inexpensive-jobs` for bootstrap and `default` for the two jobs.
  Hosts need `git`, `docker`, `buildkite-agent` with `redactor add`, and `op` for
  publishing. Git runs on the host so agent Git mirrors work normally.
- The bootstrap agent must not have publishing-secret access, and repository
  hooks must be disabled there. Secret permissions are an infrastructure boundary,
  not something the repository's release script can enforce.
- Confirm the npm token at `op://Infrastructure/npm - CI/pdf-to-markdown` is
  scoped to this package and permits unattended publishing. Confirm who can read
  that item, its expiry, and its renewal owner. A field in a shared item does not
  provide pipeline-specific access control.
- The GitHub credential at `op://Developers/GITHUB_ACCESS_TOKEN/password` needs
  tag-write access to this repository. Confirm its permissions with Infrastructure.

Both jobs request clean checkouts. The smoke container sees only its script and
the tarball, mounted read-only; it receives no publishing tokens. Publishing uses
a fresh checkout mounted read-only and a reproducible repack to check the artifact.
Tokens are loaded only in that job and registered with Buildkite's log redactor.
All GitHub API requests are authenticated.

The Node image is pinned to 24.14.1 on Debian 13, which can run the CDN CLI.
Project npm configuration retains the 15-day dependency age requirement.

## Check changes locally without publishing

```sh
npm run check
npm test
node --test ci/release.test.mjs
shellcheck -s bash ci/npm-release.sh
bk pipeline validate --file .buildkite/pipeline.yml
bk pipeline validate --file .buildkite/bootstrap.yml
```

The release tests use fake API responses and commands. A live Buildkite run is
still needed to verify agent permissions and publishing credentials.
