#!/usr/bin/env bash
set -euo pipefail
set +x

# The agent supplies Docker, buildkite-agent, and an authenticated op CLI.
# Node, npm, git, curl, and ICU come from this pinned, multi-platform image.
image='node:24.14.1-trixie@sha256:e4ceb04a1f1dd4823a1ab6ef8d2182c09d6299b507c70f20bd0eb9921a78354d'
action="${1:-}"
case "$action" in prepare|publish) ;; *) echo 'Expected prepare or publish' >&2; exit 1 ;; esac

if [[ "${BUILDKITE_PIPELINE_SLUG:-}" != pdf-to-markdown-npm-release ||
      "${BUILDKITE_BRANCH:-}" != main ||
      "${BUILDKITE_PULL_REQUEST:-}" != false ||
      ! "${BUILDKITE_COMMIT:-}" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Release requires the manual release pipeline, main, a full commit SHA, and no pull request.' >&2
  exit 1
fi
case "${BUILDKITE_SOURCE:-}" in ui|api) ;; *) echo 'Release must be started manually.' >&2; exit 1 ;; esac
[[ "$(git rev-parse HEAD)" == "$BUILDKITE_COMMIT" ]] || { echo 'Checkout does not match release commit.' >&2; exit 1; }

run_node() {
  docker run --rm --user "$(id -u):$(id -g)" \
    --volume "$PWD:/work" --workdir /work \
    --env NPM_CONFIG_CACHE=/tmp/npm-cache \
    --env CI=true \
    --env BUILDKITE_PIPELINE_SLUG --env BUILDKITE_BRANCH \
    --env BUILDKITE_PULL_REQUEST --env BUILDKITE_COMMIT --env BUILDKITE_SOURCE \
    --env NODE_AUTH_TOKEN --env RELEASE_GITHUB_TOKEN \
    "$image" node ci/release.mjs "$@"
}

# Do not inherit publishing credentials into validation or the smoke test.
unset NODE_AUTH_TOKEN NPM_TOKEN RELEASE_GITHUB_TOKEN
if [[ "$action" == prepare ]]; then
  run_node prepare
  buildkite-agent annotate --style info --context npm-release < .release-build/summary.md
else
  # Download only the artifacts produced by this build's preparation step.
  buildkite-agent artifact download '.release-build/*.tgz' . --step prepare-npm
  buildkite-agent artifact download '.release-build/manifest.json' . --step prepare-npm
  run_node preflight

  # Keep values out of argv, repository files, artifacts, and shell tracing.
  export NODE_AUTH_TOKEN
  NODE_AUTH_TOKEN="$(op read 'op://Infrastructure/npm - CI/pdf-to-markdown')"
  export RELEASE_GITHUB_TOKEN
  RELEASE_GITHUB_TOKEN="$(op read 'op://Developers/GITHUB_ACCESS_TOKEN/password')"
  trap 'unset NODE_AUTH_TOKEN RELEASE_GITHUB_TOKEN' EXIT
  run_node publish
fi
