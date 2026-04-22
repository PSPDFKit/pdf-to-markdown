# Benchmarks

Evaluated on 200 PDF documents with hand-annotated Markdown ground truth from the DP-Bench corpus.

- Benchmark date: `2026-04-22`
- Corpus: 200 documents with ground-truth Markdown annotations (42 with tables, 107 with headings)
- Metrics: NID (reading order), TEDS (table structure), MHS (heading hierarchy)
- All scores normalized to [0, 1] — higher is better

## Accuracy Metrics

| Solution | Extraction accuracy | Reading order (NID) | Table structure (TEDS) | Heading level (MHS) |
| --- | ---: | ---: | ---: | ---: |
| **Nutrient** | **0.89** | **0.93** | 0.71 | 0.82 |
| docling | 0.88 | 0.90 | **0.89** | **0.82** |
| opendataloader | 0.84 | 0.91 | 0.49 | 0.74 |
| opendataloader-hybrid | 0.83 | 0.92 | 0.43 | 0.73 |
| pymupdf4llm | 0.74 | 0.89 | 0.40 | 0.43 |
| markitdown | 0.58 | 0.88 | 0.00 | 0.00 |
| pypdf | 0.58 | 0.87 | 0.00 | 0.00 |
| liteparse | 0.57 | 0.86 | 0.00 | 0.00 |

## Speed

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

## Relative Speed Callouts

- Nutrient is `147x` faster than `liteparse`
- Nutrient is `87x` faster than `docling`
- Nutrient is `11x` faster than `opendataloader`
- Nutrient is `10x` faster than `pymupdf4llm`
- Nutrient is `7x` faster than `opendataloader-hybrid`
- Nutrient is `5x` faster than `markitdown`
- Nutrient is `2x` faster than `pypdf`
