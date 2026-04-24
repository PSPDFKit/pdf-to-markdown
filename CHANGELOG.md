# Changelog

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

## 0.1.0 — 2026-04-02

- Initial release
- PDF-to-Markdown CLI wrapper with auto-updating binary from Nutrient CDN
- Single file, batch directory, and stdout modes
- macOS Apple Silicon, Linux x86_64, and Linux arm64 support
- Free for up to 1,000 documents per calendar month
