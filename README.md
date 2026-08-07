# Nutrient PDF to Markdown

[![License: Proprietary](https://img.shields.io/badge/license-Nutrient_PDF_to_Markdown-blue)](LICENSE.md)
[![npm version](https://img.shields.io/npm/v/%40pspdfkit%2Fpdf-to-markdown)](https://www.npmjs.com/package/@pspdfkit/pdf-to-markdown)
[![macOS](https://img.shields.io/badge/macOS-arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)
[![Linux](https://img.shields.io/badge/Linux-x64_|_arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)
[![Windows](https://img.shields.io/badge/Windows-x64_|_arm64-brightgreen)](https://github.com/PSPDFKit/pdf-to-markdown)

<p align="center">
  <img src="https://raw.githubusercontent.com/PSPDFKit/pdf-to-markdown/main/docs/assets/demo.gif" alt="pdf-to-markdown demo" width="720">
</p>

**Stop wasting your context window on PDF extraction.**

Fast, accurate Markdown from PDFs — locally, with no cleanup required. Built for Claude, Codex, RAG pipelines, and document-heavy automation where noisy extraction burns tokens and makes downstream results less reliable.

- **How fast is it?** — 0.004s per page. 134x faster than docling, 53x faster than pymupdf4llm. ([benchmarks](#benchmarks))
- **How accurate is it?** — 0.93 reading order (best in class), 0.89 overall extraction accuracy, 0.82 heading detection. ([benchmarks](#benchmarks))
- **`--vision` tier** — a machine-vision ICR pipeline that tops every accuracy metric, including tables (0.94 TEDS), handles scanned and handwritten documents — and still runs faster than docling (0.35s per page). Connect a paid Nutrient PDF to Markdown plan to use it. ([benchmarks](#benchmarks))
- **Three tools, one binary** — `pdf-to-markdown` for structured Markdown, `pdf-to-text` for layout-preserving plain text, and `query` for ranked search over an extracted file. Pick by what the downstream consumer needs. ([the Nutrient document CLI](#the-nutrient-document-cli))
- **NEW: Image export** — `--enable-image-export` extracts images alongside Markdown for vision-capable LLMs. ([usage](#image-export))
- **Where do my PDFs go?** — Nowhere. The CLI runs locally. Your documents are not uploaded to Nutrient. ([trust & licensing](#trust-and-licensing))
- **What does it cost?** — Your first standard conversion starts a one-time allowance of 1,000 credits. It does not expire or renew. Account plans add monthly credits, and paid plans add Vision. ([plans](#plans-and-credits))

## The Nutrient document CLI

`pdf-to-markdown` is one verb of a single signed binary that turns **digital-born PDFs** into agent-ready output — locally and deterministically. Convert once, then work against the result:

| Command | What it does | Reach for it when |
| --- | --- | --- |
| **`pdf-to-markdown`** | PDF → clean Markdown (headings, lists, tables, reading order) | The consumer benefits from structure — most RAG and LLM-context pipelines |
| **`pdf-to-text`** | PDF → layout-preserving plain text (columns and tabular alignment survive) | The consumer is plain-text only — a non-Markdown model, a grep/awk pipeline, a column-sensitive table reader |
| **`query`** | Ranked **BM-25 search over an already-extracted file**, returning only the top line windows | You have a large conversion and want one fact or clause without reading the whole thing back into context — *parse once, query many* |

All three install together from this package (and from the [Nutrient Skills](https://github.com/pspdfkit-labs/nutrient-skills) marketplace), and share one binary in `~/.local/share/nutrient/cli/`.

> **Scanned or photographed documents?** The default engine is built for **digital-born** PDFs (a real text layer). The [`--vision` tier](#the---vision-tier) handles scanned, handwritten, and otherwise image-only documents locally on the same binary.

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

The package supports Node `18+` on macOS Apple Silicon, Linux x86_64, Linux arm64, and Windows (x64 and arm64). On Windows the commands run under Git Bash, which ships with [Git for Windows](https://git-scm.com/download/win) and is what agent tools like Claude Code already use for their shell.

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

On a supported desktop or host installation, the first standard conversion starts a one-time allowance of 1,000 credits. No signup is needed. Create an account to keep that workspace and its remaining credits, or sign in to an existing account:

```bash
nutrient auth login
```

The CLI prints a short code and opens a secure Nutrient page. Approve the request in your browser, then return to the terminal. Creating a new account preserves the current workspace and remaining included credits. Signing in to an existing account uses that account without merging the earlier usage or balance.

Check your plan, remaining credits, Vision access, and locally pending usage at any time:

```bash
nutrient auth status
```

Automatic included credits are not available in containers or CI. Sign in there, or create a secret key in the [PDF to Markdown dashboard](https://dashboard.nutrient.io/pdf-to-markdown/api_keys/) and keep it in the environment:

```bash
export NUTRIENT_API_KEY="pdf_live_..."
pdf-to-markdown input.pdf output.md
```

Both conversion commands also accept `--api-key KEY`, but environment variables are safer because command arguments can appear in shell history and process listings.

Credentials are resolved in this order: `--license-key`, `--api-key` or `NUTRIENT_API_KEY`, then a saved Nutrient login, then the installation's included allowance. An invalid configured credential is an error; the CLI does not silently fall back.

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

Both commands are backed by the same local binary; pick by what the downstream consumer needs:

- **Use `pdf-to-markdown`** when the consumer benefits from semantic structure — headings, lists, tables, and reading order. Most RAG and LLM-context pipelines fall here.
- **Use `pdf-to-text`** when the consumer is plain-text only — a non-Markdown model, a `grep`/`awk` pipeline, or a column-aligned table reader that cares about spatial layout rather than Markdown markup.

### Search a converted document (`query`)

A converted document can run to tens of thousands of lines and will blow out your context window if you read it back. `query` runs ranked BM-25 search over the extracted file and returns only the handful of line windows that matter — *parse once, query many*:

```bash
query text output.md "what is the total contract value?"
```

Each result is a `Lines A–B` window with global line numbers, so you can re-read the exact range for full context. `query` is a two-level command — `query text INPUT "QUERY"` — leaving room for more query types over time.

### Updates

The wrapper keeps the bundled binary current on its own: it checks the Nutrient CDN for a newer build at most once every six hours and updates in place. No manual update step is required. (The binary also ships a `self-update` capability, but you don't need to invoke it through these commands.)

## Platform Support

- macOS Apple Silicon (`Darwin/arm64`)
- Linux x86_64
- Linux arm64
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
| **Nutrient `--vision`** † | 1.3.1 | **0.93** | **0.96** | **0.94** | **0.87** |
| **Nutrient** | 1.3.0 | 0.89 | 0.93 | 0.74 | 0.82 |
| docling | 2.110.0 | 0.89 | 0.91 | 0.93 | 0.83 |
| pymupdf4llm | 1.28.0 | 0.86 | 0.90 | 0.73 | 0.78 |
| opendataloader | 2.4.7 | 0.83 | 0.90 | 0.48 | 0.74 |
| markitdown | 0.1.6 | 0.59 | 0.84 | 0.27 | 0.00 |
| pypdf | 6.14.2 | 0.58 | 0.87 | 0.00 | 0.00 |
| liteparse | 2.4.1 | 0.57 | 0.86 | 0.00 | 0.00 |

Among the default (non-vision) engines: Nutrient has the best reading order; docling 2.110 has the best table structure and a hair's-width overall edge at the third decimal (0.892 vs 0.889) — at 134× the runtime. The `--vision` tier tops every metric outright, including tables — while running faster than docling. The `opendataloader-hybrid` variant was not re-run (it requires a separate docling backend service); its last published numbers were 0.87 overall.

### Speed

| Solution | Seconds per page |
| --- | ---: |
| **Nutrient** | **0.004** |
| liteparse | 0.004 |
| opendataloader | 0.015 |
| pypdf | 0.015 |
| markitdown | 0.069 |
| pymupdf4llm | 0.218 |
| Nutrient `--vision` † | 0.354 |
| docling | 0.549 |

Nutrient and liteparse run batch-parallel; the other engines process sequentially in-process. Nutrient is the fastest structure-preserving parser by a wide margin — only liteparse (which preserves no table/heading structure) matches its throughput.

### Faster with Nutrient

- `134x` faster than `docling`
- `53x` faster than `pymupdf4llm`
- `17x` faster than `markitdown`
- `4x` faster than `pypdf`
- `4x` faster than `opendataloader`

### The `--vision` tier

† Nutrient 1.3.0 added a machine-vision ICR pipeline behind the `--vision` flag: layout analysis, table reconstruction, formulas, and handwriting, running locally with GPU-hybrid inference (`--provider auto`; falls back to CPU). In this benchmark (1.3.1) it tops **every** accuracy metric — including table structure, where it beats docling outright — and at 0.35 s/page it is also faster than docling. There is no speed-for-accuracy trade against the open-source field.

The first `--vision` run downloads the vision models (several hundred MB, cached locally afterward). Vision is included with paid Nutrient PDF to Markdown plans and uses 2 credits for each successful conversion. You can connect interactively with `nutrient auth login`, use `NUTRIENT_API_KEY` in automation, or continue using an existing commercial `--license-key`.

## Plans and credits

| Access | Credits | Vision |
| --- | ---: | --- |
| No account | 1,000 once | — |
| Free account | 1,000 monthly | — |
| Starter | 5,000 monthly | Included |
| Growth | 25,000 monthly | Included |
| Pro | 100,000 monthly | Included |

A successful standard conversion uses 1 credit and a successful Vision conversion uses 2. `pdf-to-markdown` and `pdf-to-text` share the same credit pool; `query` uses no credits. Failed conversions use no credits. The one-time no-account allowance never expires or renews. Account-plan allowances renew monthly, including on yearly plans. See the [live pricing page](https://www.nutrient.io/api/pricing/#api-pricing-pdf-to-markdown) for current details.

The first conversion needs an internet connection. After that, a cached allowance permits up to one hour and 25 unreported credits offline. Reconnect before either limit is reached. If the workspace is registered elsewhere while this installation is offline, those later conversions are not charged to the registered account; sign in when the CLI reconnects. Existing `--license-key` workflows are unaffected.

For the full comparison table, see [docs/benchmarks.md](docs/benchmarks.md).

## Trust and Licensing

- Standard conversion starts with 1,000 one-time credits; no signup is required
- The one-time allowance never expires or renews; account plans provide monthly credits
- PDFs stay local — your documents are not uploaded to Nutrient by this extractor
- To resume the same allowance after local state is lost, the CLI sends a product-scoped hash derived from system identifiers. The raw identifiers are not stored or sent.
- Plan usage reports conversion mode, CLI version, command surface, an idempotent event identifier, and the identifier of the signed allowance — never document contents, names, paths, output, or page counts
- Existing commercial/offline `--license-key` use continues unchanged
- The extraction engine is delivered as a signed platform binary; the repo contains only the wrapper and documentation
- The license is non-transferable. Redistribution, OEM, embedded, and white-label use require a separate agreement with Nutrient.

See [LICENSE.md](LICENSE.md) for the full terms and [docs/distribution-model.md](docs/distribution-model.md) for details on what ships in this repo vs. the binary.

## FAQ

### What makes this different from other PDF extractors?

Speed and accuracy should not be a tradeoff. Most extractors are either fast but lose structure (markitdown, pymupdf4llm) or accurate but slow (docling). Nutrient extracts at 0.011s per page with the best reading order score (0.93), strong heading and table preservation — less cleanup, fewer wasted tokens, and more reliable downstream results.

### What about scanned or handwritten documents?

The **default engine** is built for digital-born PDFs that already contain a text layer and does not OCR. The **`--vision` tier** handles scanned, photographed, and handwritten documents locally with a machine-vision ICR pipeline — see [the `--vision` tier](#the---vision-tier).

### Do my documents leave my machine?

No. The CLI processes PDFs locally. Nothing is uploaded to Nutrient. Usage reports contain conversion metadata and the CLI version. Starting or restoring the included credits also sends a product-scoped hash derived from system identifiers. Neither request includes raw system identifiers, document contents, names, paths, output, or page counts. If you feed the extracted Markdown into Claude, Codex, or another model provider, their own data policies apply.

### Do I need a license key or API token?

No signup is required on a supported desktop or host installation. Containers and CI require `nutrient auth login` or `NUTRIENT_API_KEY`. Vision requires a paid plan or an existing commercial `--license-key`.

### Why is the extraction engine closed-source?

The repo is designed to be reviewable — you can read the wrapper, the installer, and the documentation. The extraction engine is distributed as a signed binary to protect the implementation while keeping the CLI surface fully transparent.
