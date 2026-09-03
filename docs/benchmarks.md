# Benchmarks

Evaluated on 200 PDF documents with hand-annotated Markdown ground truth from the DP-Bench corpus.

- Benchmark date: `2026-07-06` (vision arm re-run `2026-07-07` on nutrient 1.3.1)
- Corpus: 200 documents with ground-truth Markdown annotations (42 with tables, 107 with headings)
- Hardware: Apple M3 Ultra (no discrete GPU)
- Metrics: NID (reading order), TEDS (table structure), MHS (heading hierarchy)
- All scores normalized to [0, 1] — higher is better
- All competitor libraries pinned to their latest versions as of the benchmark date
- Nutrient `--vision` is the local Vision tier of the same binary (`--provider auto`); its numbers below are from the 1.3.1 build, which is ~3× faster than 1.3.0 (1.045 → 0.354 s/page) with accuracy identical to four decimals

## Accuracy Metrics

| Solution | Version | Extraction accuracy | Reading order (NID) | Table structure (TEDS) | Heading level (MHS) |
| --- | --- | ---: | ---: | ---: | ---: |
| **Nutrient `--vision`** | 1.3.1 | **0.933** | **0.959** | **0.938** | **0.868** |
| docling | 2.110.0 | 0.892 | 0.905 | 0.933 | 0.829 |
| **Nutrient** | 1.3.0 | 0.889 | 0.926 | 0.739 | 0.824 |
| pymupdf4llm | 1.28.0 | 0.859 | 0.902 | 0.731 | 0.777 |
| opendataloader | 2.4.7 | 0.831 | 0.902 | 0.483 | 0.739 |
| markitdown | 0.1.6 | 0.589 | 0.844 | 0.273 | 0.000 |
| pypdf | 6.14.2 | 0.576 | 0.870 | 0.000 | 0.000 |
| liteparse | 2.4.1 | 0.570 | 0.857 | 0.000 | 0.000 |

`opendataloader-hybrid` was not re-run in this pass (requires a separate docling backend service); its `2026-04-23` numbers were 0.87 / 0.91 / 0.68 / 0.81.

## Speed

| Solution | Seconds per page |
| --- | ---: |
| **Nutrient** | **0.004** |
| liteparse | 0.004 |
| opendataloader | 0.015 |
| pypdf | 0.015 |
| markitdown | 0.069 |
| pymupdf4llm | 0.218 |
| Nutrient `--vision` | 0.354 |
| docling | 0.549 |

Nutrient and liteparse convert batch-parallel; the other engines run sequentially in-process. Timing is wall-clock over the whole corpus on the hardware above. The `--vision` timing is per-document invocation; a single batch invocation over all 200 documents times the same (0.356 s/page), so process startup and model initialization are negligible once the models are cached.

## Relative Speed Callouts (default engine)

- Nutrient is `134x` faster than `docling`
- Nutrient is `53x` faster than `pymupdf4llm`
- Nutrient is `17x` faster than `markitdown`
- Nutrient is `4x` faster than `pypdf`
- Nutrient is `4x` faster than `opendataloader`

## Reproduction

Run on the private `PSPDFKit-labs/opendataloader-bench` harness (branch `benchmark-update-with-new-parsers`): `uv run src/pdf_parser.py --engine <name>` then `uv run src/evaluator.py --engine <name>`. The vision arm uses the `nutrient-vision-cli` engine with the 1.3.1 CDN binary and authenticated Vision access.
