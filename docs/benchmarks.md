# Benchmarks

Evaluated on 200 PDF documents with hand-annotated Markdown ground truth from the DP-Bench corpus.

- Benchmark date: `2026-04-23`
- Corpus: 200 documents with ground-truth Markdown annotations (42 with tables, 107 with headings)
- Hardware: Apple M4 Max
- Metrics: NID (reading order), TEDS (table structure), MHS (heading hierarchy)
- All scores normalized to [0, 1] — higher is better
- All competitor libraries pinned to their latest versions

## Accuracy Metrics

| Solution | Version | Extraction accuracy | Reading order (NID) | Table structure (TEDS) | Heading level (MHS) |
| --- | --- | ---: | ---: | ---: | ---: |
| **Nutrient** | 1.0.1 | **0.89** | **0.93** | 0.71 | 0.82 |
| docling | 2.91.0 | 0.88 | 0.90 | **0.89** | **0.82** |
| opendataloader-hybrid | 2.3.0 | 0.87 | 0.91 | 0.68 | 0.81 |
| pymupdf4llm | 1.27.2 | 0.83 | 0.89 | 0.54 | 0.77 |
| opendataloader | 2.3.0 | 0.83 | 0.90 | 0.48 | 0.74 |
| markitdown | 0.1.5 | 0.59 | 0.84 | 0.27 | 0.00 |
| pypdf | 6.10.2 | 0.58 | 0.87 | 0.00 | 0.00 |
| liteparse | 1.2.1 | 0.57 | 0.86 | 0.00 | 0.00 |

## Speed

| Solution | Seconds per page |
| --- | ---: |
| **Nutrient** | **0.011** |
| pypdf | 0.019 |
| opendataloader | 0.023 |
| markitdown | 0.097 |
| pymupdf4llm | 0.319 |
| opendataloader-hybrid | 0.444 |
| docling | 0.527 |
| liteparse | 1.081 |

## Relative Speed Callouts

- Nutrient is `98x` faster than `liteparse`
- Nutrient is `48x` faster than `docling`
- Nutrient is `40x` faster than `opendataloader-hybrid`
- Nutrient is `29x` faster than `pymupdf4llm`
- Nutrient is `9x` faster than `markitdown`
- Nutrient is `2x` faster than `opendataloader`
