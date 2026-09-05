# Nutrient PDF to Markdown

[![License: Proprietary](https://img.shields.io/badge/license-Nutrient_PDF_to_Markdown-blue)](LICENSE.md)
[![npm version](https://img.shields.io/npm/v/%40pspdfkit%2Fpdf-to-markdown)](https://www.npmjs.com/package/@pspdfkit/pdf-to-markdown)
[![macOS](https://img.shields.io/badge/macOS-arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)
[![Linux](https://img.shields.io/badge/Linux-x64_|_arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)
[![Windows](https://img.shields.io/badge/Windows-x64_|_arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)

<p align="center">
  <img src="https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/demo.gif" alt="pdf-to-markdown demo" width="720">
</p>

Convert PDFs to clean Markdown locally. The CLI works with Claude, Codex, RAG pipelines, and other document-processing workflows.

- **How fast is it?** — 0.004s per page. 134x faster than docling, 53x faster than pymupdf4llm. ([benchmarks](#benchmarks))
- **How accurate is it?** — In our benchmark, Nutrient Standard scored 0.93 for reading order, 0.89 overall, and 0.82 for heading detection. ([benchmarks](#benchmarks))
- **Vision (`--vision`)** — Vision handles scanned and handwritten documents and has the highest score in every accuracy measure shown, including tables (0.94 TEDS). It runs locally at 0.35 seconds per page. Use a Nutrient account, API key, or Nutrient CLI license key. ([benchmarks](#benchmarks))
- **Three document tools, one binary** — `pdf-to-markdown` creates structured Markdown, `pdf-to-text` creates layout-preserving text, and `query` searches an extracted file. ([the Nutrient CLI](#the-nutrient-cli))
- **Image export** — `--enable-image-export` saves images alongside the Markdown output. ([usage](#image-export))
- **Where do my PDFs go?** — Nowhere. The CLI runs locally. Your documents are not uploaded to Nutrient. ([trust & licensing](#trust-and-licensing))
- **What does it cost?** — Standard conversion is free. Vision uses one page from your monthly allowance for each input page. ([Standard and Vision](#standard-and-vision))

## The Nutrient CLI

`pdf-to-markdown` is one command in the Nutrient CLI, which converts digital PDFs locally. Convert a PDF once, then use the output in your workflow:

| Command | What it does | Use it when |
| --- | --- | --- |
| **`pdf-to-markdown`** | Creates Markdown with headings, lists, tables, and reading order | Your workflow benefits from document structure, as most RAG and AI workflows do |
| **`pdf-to-text`** | Creates plain text that preserves columns and alignment | Your workflow needs plain text or relies on the page layout |
| **`query`** | Searches an extracted file and returns the most relevant line ranges | You need a fact or clause from a large conversion without loading the entire file |

All three install together from this package (and from the [Nutrient Skills](https://github.com/pspdfkit-labs/nutrient-skills) marketplace), and share one binary in `~/.local/share/nutrient/cli/`.

> **Scanned or photographed documents?** Standard works with PDFs that contain a text layer. [Vision](#vision) handles scanned, photographed, handwritten, and other image-only documents locally.

## Install

### Agent skill (recommended)

If you use Claude Code, Codex, Pi, Cursor, or Gemini CLI, install the [Nutrient Skills](https://github.com/pspdfkit-labs/nutrient-skills) plugin — the extraction runs automatically when your agent needs to read a PDF. Add whichever of the three skills you want (they share one binary, so any of them installs it):

```bash
npx skills add pspdfkit-labs/nutrient-skills --skill pdf-to-markdown
npx skills add pspdfkit-labs/nutrient-skills --skill pdf-to-text
npx skills add pspdfkit-labs/nutrient-skills --skill query
```

Or with marketplace/plugin flows (Claude Code, Codex):

```text
/plugin marketplace add pspdfkit-labs/nutrient-skills
/plugin install pdf-to-markdown@nutrient-skills
/plugin install pdf-to-text@nutrient-skills
/plugin install query@nutrient-skills
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

The package supports Node `18+` on macOS 13 or newer with Apple Silicon, Linux x86_64, Linux arm64, and Windows (x64 and arm64). On Windows the commands run under Git Bash, which ships with [Git for Windows](https://git-scm.com/download/win) and is what agent tools like Claude Code already use for their shell.

On Linux, use a distribution with glibc 2.38 or newer. The CLI also needs libcurl 4, ICU, and OpenSSL 3. For a minimal Ubuntu 24.04 image, install them with `apt-get install libcurl4t64 libicu74 ca-certificates`.

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

### Quick check

After install, verify the commands are available:

```bash
pdf-to-markdown --help
pdf-to-text --help
query --help
nutrient auth --help
```

The first argument after `nutrient` is reserved for CLI subcommands such as
`auth` and `self-update`. Use `pdf-to-markdown`, `pdf-to-text`, or `query`
directly for document work.

## Accounts and automation

Standard conversion is free and doesn’t require an account. Sign in to use Vision with your Nutrient plan:

```bash
nutrient auth login
```

The CLI opens a Nutrient page in your browser. Approve the request, then return to the terminal.

Check your plan, remaining Vision pages, and locally pending usage at any time:

```bash
nutrient auth status
```

Standard also works without an account in containers and continuous integration (CI). To use Vision there, create an API key in the [PDF-to-Markdown dashboard](https://dashboard.nutrient.io/nutrient-cli/api_keys/) and keep it in the environment:

```bash
export NUTRIENT_API_KEY="pdf_live_..."
pdf-to-markdown --vision input.pdf output.md
```

Both conversion commands also accept `--api-key KEY`, but environment variables are safer because command arguments can appear in shell history and process listings.

The CLI uses a Nutrient CLI license key first, then an API key, and then your saved Nutrient sign-in. Without any of these, Standard still works and Vision asks you to sign in. An invalid key or expired sign-in is reported as an error; the CLI doesn’t quietly switch to another account.

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

This saves images from the PDF in `output_resources/` and adds standard image links to the Markdown. Use it when the images are useful to the person or AI tool reading the result. It is off by default because image-heavy documents take longer to process.

### Plain text (`pdf-to-text`)

```bash
pdf-to-text input.pdf output.txt
```

Produces layout-preserving plain text: each word is placed on a character grid that mirrors its position on the page, so columns, indentation, and tabular alignment survive the conversion. As with `pdf-to-markdown`, omit the output path to write to stdout, and pass two directories to batch-convert in parallel:

```bash
pdf-to-text input.pdf            # write to stdout
pdf-to-text ./input-pdfs ./output-text
```

### Choosing `pdf-to-markdown` vs `pdf-to-text`

Both commands use the same local binary. Choose based on the output your workflow needs:

- **Use `pdf-to-markdown`** for headings, lists, tables, and reading order. Most RAG and AI workflows benefit from this structure.
- **Use `pdf-to-text`** for plain text, including `grep`/`awk` pipelines and workflows that rely on column alignment.

### Search a converted document (`query`)

A converted document can be too large for an AI model’s context window. `query` uses BM25 ranking to return the most relevant line ranges:

```bash
query text output.md "what is the total contract value?"
```

Each result includes a `Lines A–B` range, so you can read that exact part of the extracted file for more context.

### Updates

The wrapper keeps the downloaded binary current. It checks for a newer release at most once every six hours and updates in place. No manual update is required.

## Platform Support

- macOS 13 or newer on Apple Silicon (`Darwin/arm64`)
- Linux x86_64 (glibc 2.38 or newer)
- Linux arm64 (glibc 2.38 or newer)
- Windows x64
- Windows arm64

macOS Intel and Rosetta shells are unsupported; npm may allow installation, but the commands refuse to run.

Windows binaries are Authenticode-signed and run under Git Bash (`MINGW`/`MSYS`/`Cygwin` environments), bundled with Git for Windows. An x64 Git Bash on Windows-on-ARM detects as x86_64 and fetches the x64 binary, which runs fine under Windows emulation.

## Benchmarks

Nutrient is built for **digital-born** PDF extraction, so we benchmark it against the open-source parsers you'd otherwise reach for.

Benchmark results from 200 PDF documents with hand-annotated Markdown ground truth, evaluated using NID (reading order), TEDS (table structure), and MHS (heading hierarchy) metrics. All competitor libraries pinned to their latest versions as of `2026-07-06`, run on an Apple M3 Ultra (no discrete GPU).

### Visual Snapshot

![Extraction accuracy](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/extraction-accuracy.png?v=20260706)

![Reading order](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/reading-order.png?v=20260706)

![Table structure](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/table-structure.png?v=20260706)

![Heading level](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/heading-level.png?v=20260706)

![Extraction speed](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/extraction-speed.png?v=20260707)

![Faster with Nutrient](https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/faster-with-nutrient.png?v=20260706)

### Accuracy

| Solution | Version | Overall | Reading Order (NID) | Table Structure (TEDS) | Heading Level (MHS) |
| --- | --- | ---: | ---: | ---: | ---: |
| **Nutrient Vision** † | 1.3.1 | **0.93** | **0.96** | **0.94** | **0.87** |
| **Nutrient Standard** | 1.3.0 | 0.89 | 0.93 | 0.74 | 0.82 |
| docling | 2.110.0 | 0.89 | 0.91 | 0.93 | 0.83 |
| pymupdf4llm | 1.28.0 | 0.86 | 0.90 | 0.73 | 0.78 |
| opendataloader | 2.4.7 | 0.83 | 0.90 | 0.48 | 0.74 |
| markitdown | 0.1.6 | 0.59 | 0.84 | 0.27 | 0.00 |
| pypdf | 6.14.2 | 0.58 | 0.87 | 0.00 | 0.00 |
| liteparse | 2.4.1 | 0.57 | 0.86 | 0.00 | 0.00 |

Among the non-Vision results shown, Nutrient Standard has the highest reading-order score. Docling 2.110 has the highest table-structure score and a small overall lead at the third decimal (0.892 vs. 0.889), while taking 134 times longer. Vision has the highest score in every measure and runs faster than Docling. We did not rerun the `opendataloader-hybrid` variant because it requires a separate Docling service; its last published overall score was 0.87.

### Speed

| Solution | Seconds per page |
| --- | ---: |
| **Nutrient Standard** | **0.004** |
| liteparse | 0.004 |
| opendataloader | 0.015 |
| pypdf | 0.015 |
| markitdown | 0.069 |
| pymupdf4llm | 0.218 |
| Nutrient Vision † | 0.354 |
| docling | 0.549 |

Nutrient and LiteParse ran in parallel batches; the other tools processed documents sequentially. Nutrient Standard was the fastest tool in the benchmark that preserved headings and tables. LiteParse matched its speed but did not preserve that structure.

### Faster with Nutrient

- `134x` faster than `docling`
- `53x` faster than `pymupdf4llm`
- `17x` faster than `markitdown`
- `4x` faster than `pypdf`
- `4x` faster than `opendataloader`

### Vision

† The `--vision` flag improves extraction for scans, handwriting, formulas, and complex layouts. With `--provider auto`, it uses GPU acceleration when available and otherwise uses the CPU. In this benchmark, Nutrient Vision 1.3.1 has the highest score in every accuracy measure and runs faster than Docling.

The first Vision run downloads several hundred MB of models and caches them locally. Each input page uses one Vision page from your monthly allowance. Failed conversions don’t use Vision pages. Sign in with `nutrient auth login`, use `NUTRIENT_API_KEY` in automation, or pass a Nutrient CLI license key with `--license-key`.

## Standard and Vision

Standard conversion and `query` are free and don’t use Vision pages. The CLI tries to report Standard usage, but a connection problem doesn’t stop the conversion.

Vision improves results for scanned pages, handwriting, formulas, and complex tables. It requires a Nutrient account, an API key, or a Nutrient CLI license key. See the [live pricing page](https://www.nutrient.io/api/pricing/pdf-to-markdown/) for current allowances and prices.

Standard conversion can continue when Nutrient is unavailable. After Vision connects, it can work offline for one hour and process up to 100 pages before it must reconnect. A document that crosses the 100-page threshold can finish. Nutrient CLI license-key workflows continue to work offline.

For the full comparison table, see [docs/benchmarks.md](docs/benchmarks.md).

## Trust and Licensing

- Standard conversion and `query` are free and don’t require a Nutrient account
- Vision uses one page from the monthly allowance for each input page; failed conversions don’t use Vision pages
- PDFs stay local — your documents are not uploaded to Nutrient by this extractor
- The CLI reports a random event ID, command, Standard or Vision mode, input page count, time, CLI version, and the identifier needed to associate usage with an account or installation
- The CLI creates a one-way installation identifier from system details. It doesn’t send the details used to create that identifier.
- Existing Nutrient CLI license keys keep their existing terms
- The extraction engine is delivered as a signed platform binary; the repo contains only the wrapper and documentation
- The license is non-transferable. Redistribution, OEM, embedded, and white-label use require a separate agreement with Nutrient.

See [LICENSE.md](LICENSE.md) for the full terms.

## FAQ

### What makes this different from other PDF extractors?

In our benchmark, Nutrient Standard processed a page in 0.004 seconds and had the highest reading-order score among the non-Vision results. It also preserved headings and tables.

### What about scanned or handwritten documents?

Standard works with PDFs that already contain a text layer; it does not perform OCR. Vision handles scanned, photographed, and handwritten documents locally. See [Vision](#vision).

### Do my documents leave my machine?

No. Your files stay on your machine. Usage reports include the conversion mode and input page count, but not file names, paths, document contents, or output. The CLI also creates a one-way installation identifier from system details without sending those details. If you feed the extracted Markdown into Claude, Codex, or another model provider, their own data policies apply.

### Do I need a license key or API token?

No. Standard conversion works without an account, including in containers and CI. Vision requires a Nutrient account, API key, or Nutrient CLI license key.

### Why is the extraction engine closed-source?

The wrapper, installer, and documentation are public. The extraction engine is proprietary and ships as a signed platform binary.
