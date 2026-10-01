# Publishing the npm package

The **Publish npm package** GitHub Actions workflow publishes
`@pspdfkit/pdf-to-markdown` with npm trusted publishing (OIDC).
Native CLI builds, signing, and CDN publication stay in the GdPicture pipeline.

## Start a release

1. Merge the version bump and changelog into `main` through the normal PR process.
2. Open [Publish npm package](https://github.com/PSPDFKit/pdf-to-markdown/actions/workflows/publish.yml),
   choose **Run workflow**, and select `main`.

Starting the workflow authorizes publication. There is no second approval step.
The run uses the `main` commit selected at launch, even if `main` advances later.
It tests and packs that commit, then installs the tarball and exercises all four
commands against the native CLI on the production CDN. The smoke test uses
Standard conversion and needs no account or Vision credits.

A separate job verifies the artifact against a fresh checkout, publishes it as
`latest`, checks its registry integrity, and creates `v<version>` at the release
commit. The run summary records the version, commit, and tarball integrity.
The workflow does not bump versions or create a GitHub release page.
PRs and pushes do not start a release.

## Retry an incomplete release

Re-run the failed publish job in the original workflow run. Its artifact is kept
for 30 days. If npm already has the same version and integrity, the job skips
publication and finishes verification and tagging. Registry propagation can take
time; a verification timeout does not mean the publish failed. Check the job
output before changing the version.

Different contents under the same version, a tag pointing at another commit,
or a new publication that would move `latest` backwards stops the job.
It never overwrites a tag. Release runs execute one at a time; starting another
run does not cancel the active release. GitHub may replace an older pending run
if several releases are queued. The daily release-tag check reports publications
left without a tag.

## One-time setup

Before the first release, a repository administrator and an npm package maintainer
need to configure:

1. In GitHub repository settings, create an environment named `npm`. Under
   **Deployment branches and tags**, choose **Selected branches and tags** and
   allow only the branch `main`, with no tag rules. No environment secrets or
   required reviewers are needed. This restriction prevents another branch from
   obtaining publishing access by changing the workflow.
2. In the npm package's **Settings → Trusted publishing**, add a GitHub Actions
   publisher with these exact values:
   - Organization: `PSPDFKit`
   - Repository: `pdf-to-markdown`
   - Workflow filename: `publish.yml`
   - Environment: `npm`
   - Allowed action: enable direct publishing with `npm publish`. New publishers
     default to staging only, which would not allow this workflow to release.
3. Confirm repository policies allow GitHub Actions to create `v*` tags with
   the job's built-in `GITHUB_TOKEN` and use the pinned official actions.

Follow the [npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/)
when configuring the publisher. After the first successful OIDC release, the
package owner should revoke unused publishing tokens and consider selecting
**Require two-factor authentication and disallow tokens** in npm publishing access.
That setting still permits trusted publishing.

The publishing job runs on a GitHub-hosted runner with `id-token: write` and
`contents: write`. It uses OIDC for npm and the built-in `GITHUB_TOKEN` for tagging;
there are no npm tokens, shared GitHub PATs, or 1Password items to configure.
Public releases receive npm provenance automatically.

Tests run in a separate job with read-only repository permissions. The smoke
container sees only its script and the tarball, mounted read-only, with no
credentials. Publishing does not execute package lifecycle scripts. The Node
version is pinned to 24.14.1 with npm 11.11.0, which supports trusted publishing.
The smoke container uses Debian 13 to run the CDN CLI. Neither job restores
dependency caches, and project npm configuration keeps the 15-day dependency
age requirement.

## Check changes locally without publishing

```sh
npm run check
npm test
node --test ci/release.test.mjs
actionlint .github/workflows/publish.yml .github/workflows/validate.yml .github/workflows/release-tag-check.yml
```

The release tests use fake API responses and commands, including OIDC environment
variables. A real release after setup is still needed to verify npm's trust
configuration and GitHub tag permissions. Do not launch the workflow as a dry run:
it publishes when its checks pass.
