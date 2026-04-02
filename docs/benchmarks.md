# Benchmarks

These values are from a reproducible benchmark run using the [opendataloader-bench](https://github.com/PSPDFKit-labs/opendataloader-bench) evaluation harness on 200 PDF documents with hand-annotated ground truth.

- Source: [PSPDFKit-labs/opendataloader-bench](https://github.com/PSPDFKit-labs/opendataloader-bench/tree/benchmark-update-with-new-parsers)
- Benchmark date: `2026-04-02`
- Corpus: 200 documents from DP-Bench with ground-truth Markdown annotations
- Metrics: NID (reading order), TEDS (table structure), MHS (heading hierarchy)

## Accuracy Metrics

| Solution | Extraction accuracy | Reading order (NID) | Table structure (TEDS) | Heading level (MHS) |
| --- | ---: | ---: | ---: | ---: |
| docling | 0.88 | 0.90 | **0.89** | **0.82** |
| **Nutrient** | **0.88** | **0.92** | 0.66 | 0.81 |
| opendataloader | 0.83 | 0.90 | 0.49 | 0.74 |
| pymupdf4llm | 0.83 | 0.88 | 0.48 | 0.78 |
| markitdown | 0.59 | 0.84 | 0.27 | 0.00 |
| pypdf | 0.58 | 0.87 | 0.00 | 0.00 |
| liteparse | 0.57 | 0.86 | 0.00 | 0.00 |

## Speed

| Solution | Seconds per page |
| --- | ---: |
| **Nutrient** | **0.007** |
| opendataloader | 0.014 |
| pypdf | 0.019 |
| markitdown | 0.106 |
| liteparse | 0.233 |
| pymupdf4llm | 0.252 |
| docling | 0.618 |

## Relative Speed Callouts

- Nutrient is `90x` faster than `docling`
- Nutrient is `37x` faster than `pymupdf4llm`
- Nutrient is `34x` faster than `liteparse`
- Nutrient is `15x` faster than `markitdown`
- Nutrient is `3x` faster than `pypdf`
- Nutrient is `2x` faster than `opendataloader`

## Reproducibility

The benchmark harness, corpus, ground truth, and all engine outputs are published at:

https://github.com/PSPDFKit-labs/opendataloader-bench/tree/benchmark-update-with-new-parsers

To reproduce:

```sh
git clone -b benchmark-update-with-new-parsers https://github.com/PSPDFKit-labs/opendataloader-bench.git
cd opendataloader-bench
git lfs pull
uv sync
uv run src/run.py
```
