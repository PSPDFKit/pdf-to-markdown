# Benchmarks

These values mirror the benchmark figures currently published on Nutrient's PDF-to-Markdown product page:

- Source: <https://www.nutrient.io/ai/skills/pdf-to-markdown/>
- Snapshot date: `2026-03-31`
- Hardware note on page: `Benchmark data recorded on AMD EPYC 9454`

## Accuracy Metrics

| Solution | Extraction accuracy | Reading order (NID) | Table structure (TEDS) | Heading level (MHS) |
| --- | ---: | ---: | ---: | ---: |
| Nutrient | 0.88 | 0.92 | 0.66 | 0.81 |
| docling | 0.89 | 0.91 | 0.93 | 0.83 |
| opendataloader | 0.84 | 0.91 | 0.49 | 0.74 |
| opendataloader-hybrid | 0.83 | 0.91 | 0.43 | 0.73 |
| pymupdf4llm | 0.74 | 0.89 | 0.40 | 0.43 |
| markitdown | 0.58 | 0.88 | 0.00 | 0.00 |

## Speed

| Solution | Seconds per page |
| --- | ---: |
| Nutrient | 0.008 |
| opendataloader | 0.056 |
| opendataloader-hybrid | 0.057 |
| markitdown | 0.058 |
| pymupdf4llm | 0.083 |
| docling | 1.473 |

## Relative Speed Callouts

- Nutrient is `176x` faster than `docling`
- Nutrient is `10x` faster than `opendataloader`
- Nutrient is `7x` faster than `opendataloader-hybrid`
- Nutrient is `7x` faster than `pymupdf4llm`
- Nutrient is `7x` faster than `markitdown`

## Note

This file reflects the currently published benchmark table. A public reproducibility harness is planned as a future addition.
