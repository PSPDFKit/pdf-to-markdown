# Benchmarks

Evaluated on 200 PDF documents with hand-annotated Markdown ground truth from the DP-Bench corpus.

- Benchmark date: `2026-07-06` (Vision rerun on `2026-07-07` with Nutrient 1.3.1)
- Corpus: 200 documents with ground-truth Markdown annotations (42 with tables, 107 with headings)
- Hardware: Apple M3 Ultra (no discrete GPU)
- Metrics: NID (reading order), TEDS (table structure), MHS (heading hierarchy)
- All scores normalized to [0, 1] — higher is better
- All competitor libraries pinned to their latest versions as of the benchmark date
- Vision runs locally in the same binary. The 1.3.1 result below uses `--provider auto`; it was about three times faster than 1.3.0 (1.045 → 0.354 seconds per page) with the same accuracy to four decimal places.

## Accuracy metrics

| Solution | Version | Extraction accuracy | Reading order (NID) | Table structure (TEDS) | Heading level (MHS) |
| --- | --- | ---: | ---: | ---: | ---: |
| **Nutrient Vision** | 1.3.1 | **0.933** | **0.959** | **0.938** | **0.868** |
| docling | 2.110.0 | 0.892 | 0.905 | 0.933 | 0.829 |
| **Nutrient Standard** | 1.3.0 | 0.889 | 0.926 | 0.739 | 0.824 |
| pymupdf4llm | 1.28.0 | 0.859 | 0.902 | 0.731 | 0.777 |
| opendataloader | 2.4.7 | 0.831 | 0.902 | 0.483 | 0.739 |
| markitdown | 0.1.6 | 0.589 | 0.844 | 0.273 | 0.000 |
| pypdf | 6.14.2 | 0.576 | 0.870 | 0.000 | 0.000 |
| liteparse | 2.4.1 | 0.570 | 0.857 | 0.000 | 0.000 |

`opendataloader-hybrid` was not re-run in this pass (requires a separate docling backend service); its `2026-04-23` numbers were 0.87 / 0.91 / 0.68 / 0.81.

## Speed

| Solution | Seconds per page |
| --- | ---: |
| **Nutrient Standard** | **0.004** |
| liteparse | 0.004 |
| opendataloader | 0.015 |
| pypdf | 0.015 |
| markitdown | 0.069 |
| pymupdf4llm | 0.218 |
| Nutrient Vision | 0.354 |
| docling | 0.549 |

Nutrient and LiteParse processed batches in parallel; the other tools processed documents sequentially. Timing is wall-clock over the whole corpus on the hardware above. Vision took 0.354 seconds per page when invoked once per document and 0.356 seconds per page in one 200-document batch, after the models were cached.

## Relative speed of Standard

- Nutrient Standard is `134x` faster than `docling`
- Nutrient Standard is `53x` faster than `pymupdf4llm`
- Nutrient Standard is `17x` faster than `markitdown`
- Nutrient Standard is `4x` faster than `pypdf`
- Nutrient Standard is `4x` faster than `opendataloader`

## Reproduction

The corpus, evaluation method, and public Standard results are available in the [OpenDataLoader benchmark](https://github.com/opendataloader-project/opendataloader-bench). We ran Vision internally against the same corpus and evaluation method because it requires authenticated access.
