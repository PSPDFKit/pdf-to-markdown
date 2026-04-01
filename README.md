# Nutrient PDF to Markdown

Standalone CLI wrapper and product documentation for Nutrient's PDF-to-Markdown extractor.

This repo is the shareable entrypoint for the CLI. The extraction engine itself is distributed as a proprietary prebuilt binary and runs locally on the user's machine. The `nutrient-skills` marketplace repo remains the right place to install the agent skill.

## Why This Repo Exists

`nutrient-skills` is optimized for agent marketplace distribution.

This repo is optimized for:

- a dedicated CLI landing page
- direct install instructions
- npm-style CLI packaging without publishing the extractor source
- product benchmarks and trust details in one README
- a stable link to send when someone asks for "the PDF-to-Markdown CLI"

## What You Get

- `bin/pdf-to-markdown`: thin wrapper that downloads the current platform binary from the Nutrient CDN and executes it locally
- `install.sh`: installer for `~/.local/bin/pdf-to-markdown`
- `package.json`: CLI package metadata so the repo can be installed or published like a normal command-line tool
- [docs/benchmarks.md](/Users/admin/Projects/pdf-to-markdown/docs/benchmarks.md): benchmark values currently published on the Nutrient site
- [docs/distribution-model.md](/Users/admin/Projects/pdf-to-markdown/docs/distribution-model.md): what stays public vs private

## Platform Support

The current wrapper supports:

- macOS Apple Silicon (`Darwin/arm64`)
- Linux x86_64
- Linux arm64

## Install

### Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/install.sh | sh
```

This installs `pdf-to-markdown` into `~/.local/bin` by default.

### Install from a clone

```bash
git clone https://github.com/PSPDFKit/pdf-to-markdown.git
cd pdf-to-markdown
./install.sh
```

### Install from the repo with npm

```bash
git clone https://github.com/PSPDFKit/pdf-to-markdown.git
cd pdf-to-markdown
npm install -g .
```

This works because the repository is packaged as a standard CLI wrapper even though the extraction engine itself is not in the repo.

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

## Benchmarks

Published benchmark values from [Nutrient's PDF-to-Markdown page](https://www.nutrient.io/ai/skills/pdf-to-markdown/), recorded on `AMD EPYC 9454`.

### Visual Snapshot

![Extraction accuracy benchmark](docs/assets/extraction-accuracy.svg)

![Extraction speed benchmark](docs/assets/extraction-speed.svg)

![Structure quality benchmark](docs/assets/structure-quality.svg)

![Relative speedup benchmark](docs/assets/faster-with-nutrient.svg)

### Accuracy

| Metric | Nutrient | Best competitor | MarkItDown |
| --- | ---: | ---: | ---: |
| Extraction accuracy | 0.88 | 0.89 (docling) | 0.58 |
| Reading order (NID) | 0.92 | 0.91 | 0.88 |
| Table structure (TEDS) | 0.66 | 0.93 (docling) | 0.00 |
| Heading level (MHS) | 0.81 | 0.83 (docling) | 0.00 |

### Speed

| Solution | Seconds per page |
| --- | ---: |
| Nutrient | 0.008 |
| opendataloader | 0.056 |
| opendataloader-hybrid | 0.057 |
| markitdown | 0.058 |
| pymupdf4llm | 0.083 |
| docling | 1.473 |

### Faster with Nutrient

- `176x` faster than `docling`
- `10x` faster than `opendataloader`
- `7x` faster than `opendataloader-hybrid`
- `7x` faster than `pymupdf4llm`
- `7x` faster than `markitdown`

For the full comparison table, see [docs/benchmarks.md](/Users/admin/Projects/pdf-to-markdown/docs/benchmarks.md).

## Trust And Licensing

- Free for up to `1,000` documents per calendar month
- PDFs stay local to the CLI workflow and are not uploaded to Nutrient by this extractor
- Commercial licensing is required for more than `1,000` documents per month, redistribution of the binary, or OEM/white-label use

See [LICENSE.md](/Users/admin/Projects/pdf-to-markdown/LICENSE.md) for the current repo and binary terms.

## Closed-Source By Design

This repository is meant to be reviewable without exposing the extractor implementation.

- The repo contains wrapper code, install surfaces, and documentation.
- The proprietary engine is delivered as a signed platform binary from the Nutrient CDN.
- Private build scripts, credentials, and engine source should never be checked into this repo.

The detailed boundary is documented in [docs/distribution-model.md](/Users/admin/Projects/pdf-to-markdown/docs/distribution-model.md).

## Agent Skill

If you want the same capability inside Claude Code, Codex, Cursor, or Gemini CLI, install the skill from the marketplace repo instead of using this CLI repo directly:

```bash
npx skills add pspdfkit-labs/nutrient-skills --skill pdf-to-markdown
```

Or with marketplace/plugin flows:

```text
/plugin marketplace add pspdfkit-labs/nutrient-skills
/plugin install pdf-to-markdown@nutrient-skills
```

## How The Wrapper Works

`bin/pdf-to-markdown` is intentionally small:

1. Detect the current platform.
2. Read the latest release id from the Nutrient CDN.
3. Download the matching archive into `~/.local/share/nutrient/cli/`.
4. Cache the installed binary and only re-check for updates every 6 hours.
5. Execute the downloaded binary with the arguments you passed.

That gives you a public repo and a stable CLI entrypoint without exposing the extraction engine source.
