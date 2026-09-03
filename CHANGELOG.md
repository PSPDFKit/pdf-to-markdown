# Changelog

## Unreleased

- Added the `nutrient` entry point and `nutrient auth login`, `status`, and `logout` workflows.
- Added Nutrient sign-in, Vision access through account plans or API keys, offline Vision support, and usage reporting to both conversion commands.
- Kept basic local conversion and existing `--license-key` workflows backward compatible.

## 0.5.1 — 2026-07-23

- Allow npm installation on Windows by adding `win32` to the package OS list
- Verify downloaded archives when an optional SHA-256 sidecar is present, with strict verification available through `NUTRIENT_REQUIRE_CHECKSUM=1`
- Serialize binary updates with an install lock and replace installations with an atomic swap that preserves the live directory until the replacement is ready
- Add connection, transfer, and retry limits to wrapper and installer downloads
- Prevent piped-shell `$0` hijacking and stage all three installer commands before replacing existing files
- Harden CI validation, release-tag checks, shell linting, and cross-platform installer coverage

## 0.5.0 — 2026-07-19

- Windows support: the Nutrient CDN now ships Authenticode-signed `windows-amd64` and `windows-arm64` binaries (nutrient 1.4.0+), and the bootstrap wrappers detect Git Bash environments (`MINGW`/`MSYS`/`CYGWIN`) and download the matching `.exe`
- No PowerShell twin: on native Windows the POSIX wrappers run under Git Bash, which is bundled with Git for Windows and is what Claude Code's Bash tool uses; an x64 Git Bash on Windows-on-ARM fetches the amd64 binary and runs under Windows emulation
- No changes to the extraction engine or benchmarks in this release

## 0.4.0 — 2026-06-30

- Add `query` command: ranked BM-25 search over an already-extracted file, returning only the top line windows with global line numbers ("parse once, query many") — backed by the same local binary via an `argv[0]` symlink (`query` is a two-level command, `query text INPUT "QUERY"`)
- `install.sh` and the npm package now install `pdf-to-markdown`, `pdf-to-text`, and `query`
- README reframed as the Nutrient document CLI: a three-command family for digital-born PDFs, with explicit positioning vs. open-source parsers (not cloud vision models) and a pointer to the Data Extraction API for scanned/handwritten documents and schema-level structured extraction
- No changes to the extraction engine or benchmarks in this release

## 0.3.0 — 2026-06-17

- Add `pdf-to-text` command: layout-preserving plain-text extraction (single file, batch directory, and stdout modes), backed by the same local binary as `pdf-to-markdown`
- Pin verb dispatch explicitly via an `argv[0]` symlink so each command targets its own verb on the multi-call nutrient 1.1.0 binary, rather than relying on the binary's default-to-markdown behavior
- `install.sh` and the npm package now install both `pdf-to-markdown` and `pdf-to-text`
- Document when to use `pdf-to-text` vs `pdf-to-markdown`, plus the wrapper's automatic update behavior
- Benchmarks unchanged this release

## 0.2.2 — 2026-04-23

- Re-run benchmarks with all competitor libraries updated to latest versions
- Pin exact library versions in benchmark tables for transparency
- Fix ODL hybrid scoring (was running without docling backend server, producing degraded results)
- pymupdf4llm updated 0.3.4 → 1.27.2 (major version bump, significant quality improvement)
- markitdown updated 0.1.4 → 0.1.5 (table extraction restored)
- opendataloader-pdf updated 1.9.1 → 2.3.0
- docling updated 2.71.0 → 2.91.0

## 0.2.1 — 2026-04-22

- Add `--enable-image-export` flag: extracts images to `{output}_resources/` and references them as Markdown image links (off by default)
- Update benchmarks to 2026-04-22 run (nutrient now #1 overall at 0.89, 87x faster than docling)
- Add opendataloader-hybrid, pypdf, and liteparse to benchmark tables
- Refresh benchmark chart images

## 0.2.0 — 2026-04-22

- Published to npm and superseded by 0.2.1 the same day

## 0.1.0 — 2026-04-02

- Initial release
- PDF-to-Markdown CLI wrapper with auto-updating binary from Nutrient CDN
- Single file, batch directory, and stdout modes
- macOS Apple Silicon, Linux x86_64, and Linux arm64 support
- Free for up to 1,000 documents per calendar month
