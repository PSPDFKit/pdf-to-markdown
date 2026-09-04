# Distribution Model

This repository makes the Nutrient CLI easy to evaluate and install without exposing the proprietary extraction engine.

## What Stays In This Repo

- public wrapper logic in [bin/nutrient](../bin/nutrient), [bin/pdf-to-markdown](../bin/pdf-to-markdown), [bin/pdf-to-text](../bin/pdf-to-text), and [bin/query](../bin/query) — four thin wrappers over one shared binary
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
   - `windows-amd64.tar.gz`
   - `windows-arm64.tar.gz`
3. Each tarball contains exactly one executable with the expected filename:
   - `nutrient-linux-amd64`
   - `nutrient-linux-arm64`
   - `nutrient-macos-arm64`
   - `nutrient-windows-amd64.exe`
   - `nutrient-windows-arm64.exe`
4. A release may provide a checksum sidecar named `<target>.tar.gz.sha256` beside each tarball. The wrapper reads the first 64-character hexadecimal token and compares it with the archive's SHA-256 digest. A mismatch stops installation. If the sidecar cannot be downloaded or no supported SHA-256 tool is available, installation proceeds by default; set `NUTRIENT_REQUIRE_CHECKSUM=1` to require verification and fail when either is unavailable.

The wrappers create `argv[0]` command links named `nutrient`, `pdf-to-markdown`, `pdf-to-text`, and `query`: symlinks where supported, or copies when Git Bash uses copy semantics. The shared binary selects its command from the invoked name, so all four commands dispatch through the same target-specific binary.

As long as that contract remains stable, the public wrappers can stay small and the proprietary engine can remain fully private.

## Design Rationale

- The repo is the public product surface.
- The CLI wrapper is installable and versionable.
- Users can review usage, benchmarks, trust details, and installation steps in one place.
- The engine itself is distributed only as signed binaries.

That gives you a shareable repository without publishing sensitive implementation details.
