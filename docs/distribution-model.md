# Distribution Model

This repository is designed to make the CLI easy to evaluate and install without exposing the proprietary extraction engine.

## What Stays In This Repo

- public wrapper logic in [bin/pdf-to-markdown](/Users/admin/Projects/pdf-to-markdown/bin/pdf-to-markdown)
- installer in [install.sh](/Users/admin/Projects/pdf-to-markdown/install.sh)
- package metadata in [package.json](/Users/admin/Projects/pdf-to-markdown/package.json)
- public README and benchmark snapshots

## What Must Stay Private

- the extraction engine source code
- proprietary datasets, heuristics, and model assets
- signing credentials
- private CI/CD that builds and signs binaries
- upload tooling and credentials for the release CDN

## Runtime Contract

The public CLI wrapper relies on a very small, stable contract:

1. `LATEST` contains a release id such as `20260331T205256Z`.
2. Each release id exposes one tarball per supported target:
   - `linux-amd64.tar.gz`
   - `linux-arm64.tar.gz`
   - `macos-arm64.tar.gz`
3. Each tarball contains exactly one executable with the expected filename:
   - `nutrient-linux-amd64`
   - `nutrient-linux-arm64`
   - `nutrient-macos-arm64`

As long as that contract remains stable, the public wrapper can stay tiny and the proprietary engine can remain fully private.

## Why This Looks Like A Real CLI Repo

LiteParse exposes source and ships a CLI from the same repository.

This repository takes a different approach:

- the repo is the public product surface
- the CLI wrapper is installable and versionable
- users can review usage, benchmarks, trust details, and installation steps in one place
- the engine itself is distributed only as signed binaries

That gives you a shareable repository without publishing sensitive implementation details.

## Suggested Private Build Flow

1. Build platform binaries in a private repository or private CI pipeline.
2. Sign the macOS binary and any other platform artifacts as needed.
3. Package each target into a tarball containing exactly one binary.
4. Upload the tarballs and `LATEST` to `https://agent-cdn.nutrient.io/pdf-to-markdown/`.
5. Keep this public repo limited to wrapper and documentation changes.

## Review Checklist Before Making Public

- no private build scripts or internal upload helpers are present
- no credentials, tokens, or bucket names are present beyond public CDN URLs
- no proprietary benchmark raw data or confidential datasets are checked in
- no internal-only product roadmap or pricing material is present
- installer and wrapper only reference public endpoints
