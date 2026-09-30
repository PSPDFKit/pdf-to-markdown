#!/usr/bin/env bash
set -euo pipefail
set +x

image='node:24.14.1-trixie@sha256:e4ceb04a1f1dd4823a1ab6ef8d2182c09d6299b507c70f20bd0eb9921a78354d'
action="${1:-}"
case "$action" in prepare|publish) ;; *) echo 'Expected prepare or publish' >&2; exit 1 ;; esac

# Git runs on the host: agent checkouts can borrow objects from a Git mirror.
[[ "$(git rev-parse HEAD)" == "$BUILDKITE_COMMIT" ]] || { echo 'Checkout does not match release commit.' >&2; exit 1; }
unset NODE_AUTH_TOKEN NPM_TOKEN RELEASE_GITHUB_TOKEN
mount_mode=ro
if [[ "$action" == prepare ]]; then mount_mode=rw; fi
run_node() {
  docker run --rm --user "$(id -u):$(id -g)" \
    --volume "$PWD:/work:$mount_mode" --workdir /work \
    --env NPM_CONFIG_CACHE=/tmp/npm-cache --env CI=true \
    --env BUILDKITE_COMMIT --env NODE_AUTH_TOKEN --env RELEASE_GITHUB_TOKEN \
    "$image" node ci/release.mjs "$action"
}

if [[ "$action" == prepare ]]; then
  run_node
  tarballs=(.release-build/*.tgz)
  [[ "${#tarballs[@]}" == 1 && -f "${tarballs[0]}" ]] || { echo 'Expected one release tarball.' >&2; exit 1; }
  # The downloaded CLI cannot write to the checkout or leave state for publishing.
  docker run --rm --user "$(id -u):$(id -g)" \
    --volume "$PWD/ci/smoke.mjs:/smoke.mjs:ro" \
    --volume "$PWD/${tarballs[0]}:/package.tgz:ro" \
    "$image" node /smoke.mjs /package.tgz
  buildkite-agent annotate --style info --context npm-release < .release-build/summary.md
else
  buildkite-agent artifact download '.release-build/*.tgz' . --step prepare-npm
  buildkite-agent artifact download '.release-build/manifest.json' . --step prepare-npm
  export NODE_AUTH_TOKEN RELEASE_GITHUB_TOKEN
  NODE_AUTH_TOKEN="$(op read 'op://Infrastructure/npm - CI/pdf-to-markdown')"
  printf '%s' "$NODE_AUTH_TOKEN" | buildkite-agent redactor add
  RELEASE_GITHUB_TOKEN="$(op read 'op://Developers/GITHUB_ACCESS_TOKEN/password')"
  printf '%s' "$RELEASE_GITHUB_TOKEN" | buildkite-agent redactor add
  run_node
fi
