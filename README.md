# Nutrient PDF to Markdown

[![License: Proprietary](https://img.shields.io/badge/license-Nutrient_Free_Use-blue)](LICENSE.md)
[![macOS](https://img.shields.io/badge/macOS-arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)
[![Linux](https://img.shields.io/badge/Linux-x64_|_arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)
[![Windows](https://img.shields.io/badge/Windows-x64_(coming_soon)-yellow)](https://github.com/PSPDFKit/pdf-to-markdown)

<p align="center">
  <img src="docs/assets/demo.gif" alt="pdf-to-markdown demo" width="720">
</p>

**Stop wasting your context window on PDF extraction.**

Fast, accurate Markdown from PDFs — locally, with no cleanup required. Built for Claude, Codex, RAG pipelines, and document-heavy automation where noisy extraction burns tokens and makes downstream results less reliable.

- **How fast is it?** — 0.007s per page. 90x faster than docling, 37x faster than pymupdf4llm. ([benchmarks](#benchmarks))
- **How accurate is it?** — 0.92 reading order (best in class), 0.88 overall extraction accuracy, 0.81 heading detection. ([benchmarks](#benchmarks))
- **Where do my PDFs go?** — Nowhere. The CLI runs locally. Your documents are not uploaded to Nutrient. ([trust & licensing](#trust-and-licensing))
- **What does it cost?** — Free for up to 1,000 documents per calendar month. No license key, no signup, no API token. ([license](LICENSE.md))

## Install

### Agent skill (recommended)

If you use Claude Code, Codex, Cursor, or Gemini CLI, install the [Nutrient Skills](https://github.com/pspdfkit-labs/nutrient-skills) plugin — the extraction runs automatically when your agent needs to read a PDF:

```bash
npx skills add pspdfkit-labs/nutrient-skills --skill pdf-to-markdown
```

Or with marketplace/plugin flows:

```text
/plugin marketplace add pspdfkit-labs/nutrient-skills
/plugin install pdf-to-markdown@nutrient-skills
```

Once installed, just reference a PDF in your prompt — no extra commands needed:

> "Extract the pricing table from proposal.pdf"

The skill invokes the CLI transparently and passes the resulting Markdown into your agent context.

### Standalone CLI

For use outside an agent, install the CLI directly:

```bash
curl -fsSL https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/install.sh | sh
```

This installs `pdf-to-markdown` into `~/.local/bin` by default.

You can also install from a clone:

```bash
git clone https://github.com/PSPDFKit/pdf-to-markdown.git
cd pdf-to-markdown
./install.sh            # or: npm install -g .
```

## Usage

### Single PDF

```bash
pdf-to-markdown input.pdf output.md
```

If `output.md` is omitted, Markdown is written to stdout.

### Batch directory

```bash
pdf-to-markdown ./input-pdfs ./output-markdown
```

When both arguments are directories, the CLI converts every PDF in the input directory and writes matching Markdown files into the output directory.

## Platform Support

- macOS Apple Silicon (`Darwin/arm64`)
- Linux x86_64
- Linux arm64
- Windows x64 (coming soon)

## Benchmarks

Benchmark results from 200 PDF documents with hand-annotated Markdown ground truth, evaluated using NID (reading order), TEDS (table structure), and MHS (heading hierarchy) metrics. Benchmarked on `2026-04-02`.

### Accuracy

| Solution | Overall | Reading Order (NID) | Table Structure (TEDS) | Heading Level (MHS) |
| --- | ---: | ---: | ---: | ---: |
| docling | **0.88** | 0.90 | **0.89** | **0.82** |
| **Nutrient** | **0.88** | **0.92** | 0.66 | 0.81 |
| opendataloader | 0.83 | 0.90 | 0.49 | 0.74 |
| pymupdf4llm | 0.83 | 0.88 | 0.48 | 0.78 |
| markitdown | 0.59 | 0.84 | 0.27 | 0.00 |
| pypdf | 0.58 | 0.87 | 0.00 | 0.00 |
| liteparse | 0.57 | 0.86 | 0.00 | 0.00 |

### Speed

| Solution | Seconds per page |
| --- | ---: |
| **Nutrient** | **0.007** |
| opendataloader | 0.014 |
| pypdf | 0.019 |
| markitdown | 0.106 |
| liteparse | 0.233 |
| pymupdf4llm | 0.252 |
| docling | 0.618 |

### Faster with Nutrient

- `90x` faster than `docling`
- `37x` faster than `pymupdf4llm`
- `34x` faster than `liteparse`
- `15x` faster than `markitdown`
- `3x` faster than `pypdf`
- `2x` faster than `opendataloader`

For the full comparison table, see [docs/benchmarks.md](docs/benchmarks.md).

## Trust and Licensing

- Free for up to `1,000` documents per calendar month
- PDFs stay local — your documents are not uploaded to Nutrient by this extractor
- A commercial license is required for processing more than `1,000` documents per month
- The extraction engine is delivered as a signed platform binary; the repo contains only the wrapper and documentation
- The license is non-transferable — you may not redistribute the binary standalone or sublicense it to third parties; embedding it in your own application is permitted under the free tier terms

See [LICENSE.md](LICENSE.md) for the full terms and [docs/distribution-model.md](docs/distribution-model.md) for details on what ships in this repo vs. the binary.

## FAQ

### What makes this different from other PDF extractors?

Speed and accuracy should not be a tradeoff. Most extractors are either fast but lose structure (markitdown, pymupdf4llm) or accurate but slow (docling). Nutrient extracts at 0.007s per page with strong reading order, heading, and table preservation — less cleanup, fewer wasted tokens, and more reliable downstream results.

### Do my documents leave my machine?

No. The CLI processes PDFs locally. Nothing is uploaded to Nutrient. Note that if you feed the extracted Markdown into Claude, Codex, or another model provider, their own data policies apply.

### Do I need a license key or API token?

No. There is no signup, no license key, and no API token. Install the CLI and start converting. The free tier (up to 1,000 documents per calendar month) is enforced via the [license terms](LICENSE.md), not a technical gate. If you need to process more than 1,000 documents per month, contact `sales@nutrient.io` for a commercial license.

### Why is the extraction engine closed-source?

The repo is designed to be reviewable — you can read the wrapper, the installer, and the documentation. The extraction engine is distributed as a signed binary to protect the implementation while keeping the CLI surface fully transparent.
