# Distribution Model

This repository is designed to make the CLI easy to evaluate and install without exposing the proprietary extraction engine.

## What Stays In This Repo

- public wrapper logic in [bin/pdf-to-markdown](../bin/pdf-to-markdown)
- installer in [install.sh](../install.sh)
- package metadata in [package.json](../package.json)
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

## Design Rationale

- The repo is the public product surface.
- The CLI wrapper is installable and versionable.
- Users can review usage, benchmarks, trust details, and installation steps in one place.
- The engine itself is distributed only as signed binaries.

That gives you a shareable repository without publishing sensitive implementation details.
