# Nutrient PDF to Markdown

[![License: Proprietary](https://img.shields.io/badge/license-Nutrient_Free_Use-blue)](LICENSE.md)
[![npm version](https://img.shields.io/npm/v/%40pspdfkit%2Fpdf-to-markdown)](https://www.npmjs.com/package/@pspdfkit/pdf-to-markdown)
[![macOS](https://img.shields.io/badge/macOS-arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)
[![Linux](https://img.shields.io/badge/Linux-x64_|_arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)
[![Windows](https://img.shields.io/badge/Windows-x64_(coming_soon)-yellow)](https://github.com/PSPDFKit/pdf-to-markdown)

<p align="center">
  <img src="https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/demo.gif" alt="pdf-to-markdown demo" width="720">
</p>

**Stop wasting your context window on PDF extraction.**

Fast, accurate Markdown from PDFs — locally, with no cleanup required. Built for Claude, Codex, RAG pipelines, and document-heavy automation where noisy extraction burns tokens and makes downstream results less reliable.

- **How fast is it?** — 0.007s per page. 87x faster than docling, 10x faster than pymupdf4llm. ([benchmarks](#benchmarks))
- **How accurate is it?** — 0.93 reading order (best in class), 0.89 overall extraction accuracy, 0.82 heading detection. ([benchmarks](#benchmarks))
- **NEW: Image export** — `--enable-image-export` extracts images alongside Markdown for vision-capable LLMs. ([usage](#image-export))
- **Where do my PDFs go?** — Nowhere. The CLI runs locally. Your documents are not uploaded to Nutrient. ([trust & licensing](#trust-and-licensing))
- **What does it cost?** — Free for up to 1,000 documents per calendar month. No license key, no signup, no API token. ([license](LICENSE.md))

## Install

### Agent skill (recommended)

If you use Claude Code, Codex, Pi, Cursor, or Gemini CLI, install the [Nutrient Skills](https://github.com/pspdfkit-labs/nutrient-skills) plugin — the extraction runs automatically when your agent needs to read a PDF:

```bash
npx skills add pspdfkit-labs/nutrient-skills --skill pdf-to-markdown
```

Or with marketplace/plugin flows (Claude Code, Codex):

```text
/plugin marketplace add pspdfkit-labs/nutrient-skills
/plugin install pdf-to-markdown@nutrient-skills
```

With Pi:

```bash
pi install git:github.com/PSPDFKit-labs/nutrient-skills
```

Once installed, just reference a PDF in your prompt — no extra commands needed:

> "Extract the pricing table from proposal.pdf"

The skill invokes the CLI transparently and passes the resulting Markdown into your agent context.

### Standalone CLI

For use outside an agent, install the published npm package:

```bash
npm install -g @pspdfkit/pdf-to-markdown
```

Or run it without a global install:

```bash
npx @pspdfkit/pdf-to-markdown --help
```

The package supports Node `18+` on macOS Apple Silicon, Linux x86_64, and Linux arm64.

If you prefer a shell installer, keep the curl fallback:

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

### Quick Check

After install, verify the CLI is available:

```bash
pdf-to-markdown --help
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

### Image export

```bash
pdf-to-markdown --enable-image-export input.pdf output.md
```

Extracts images from the PDF and saves them to `output_resources/`, referenced as standard Markdown image links in the output. Useful when feeding results to vision-capable LLMs or when image context improves downstream accuracy. Off by default because it increases processing time for image-heavy documents.

## Platform Support

- macOS Apple Silicon (`Darwin/arm64`)
- Linux x86_64
- Linux arm64
- Windows x64 (coming soon)

## Benchmarks

Benchmark results from 200 PDF documents with hand-annotated Markdown ground truth, evaluated using NID (reading order), TEDS (table structure), and MHS (heading hierarchy) metrics. Benchmarked on `2026-04-22`.

### Visual Snapshot

![Extraction accuracy](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/extraction-accuracy.png?v=20260422)

![Reading order](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/reading-order.png?v=20260422)

![Table structure](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/table-structure.png?v=20260422)

![Heading level](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/heading-level.png?v=20260422)

![Extraction speed](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/extraction-speed.png?v=20260422)

![Faster with Nutrient](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/faster-with-nutrient.png?v=20260422)

### Accuracy

| Solution | Overall | Reading Order (NID) | Table Structure (TEDS) | Heading Level (MHS) |
| --- | ---: | ---: | ---: | ---: |
| **Nutrient** | **0.89** | **0.93** | 0.71 | 0.82 |
| docling | 0.88 | 0.90 | **0.89** | **0.82** |
| opendataloader | 0.84 | 0.91 | 0.49 | 0.74 |
| opendataloader-hybrid | 0.83 | 0.92 | 0.43 | 0.73 |
| pymupdf4llm | 0.74 | 0.89 | 0.40 | 0.43 |
| markitdown | 0.58 | 0.88 | 0.00 | 0.00 |
| pypdf | 0.58 | 0.87 | 0.00 | 0.00 |
| liteparse | 0.57 | 0.86 | 0.00 | 0.00 |

### Speed

| Solution | Seconds per page |
| --- | ---: |
| **Nutrient** | **0.007** |
| pypdf | 0.017 |
| markitdown | 0.038 |
| opendataloader-hybrid | 0.048 |
| pymupdf4llm | 0.071 |
| opendataloader | 0.079 |
| docling | 0.610 |
| liteparse | 1.033 |

### Faster with Nutrient

- `147x` faster than `liteparse`
- `87x` faster than `docling`
- `11x` faster than `opendataloader`
- `10x` faster than `pymupdf4llm`
- `7x` faster than `opendataloader-hybrid`
- `5x` faster than `markitdown`

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

Speed and accuracy should not be a tradeoff. Most extractors are either fast but lose structure (markitdown, pymupdf4llm) or accurate but slow (docling). Nutrient extracts at 0.007s per page with the best reading order score (0.93), strong heading and table preservation — less cleanup, fewer wasted tokens, and more reliable downstream results.

### Do my documents leave my machine?

No. The CLI processes PDFs locally. Nothing is uploaded to Nutrient. Note that if you feed the extracted Markdown into Claude, Codex, or another model provider, their own data policies apply.

### Do I need a license key or API token?

No. There is no signup, no license key, and no API token. Install the CLI and start converting. The free tier (up to 1,000 documents per calendar month) is enforced via the [license terms](LICENSE.md), not a technical gate. If you need to process more than 1,000 documents per month, contact `sales@nutrient.io` for a commercial license.

### Why is the extraction engine closed-source?

The repo is designed to be reviewable — you can read the wrapper, the installer, and the documentation. The extraction engine is distributed as a signed binary to protect the implementation while keeping the CLI surface fully transparent.
