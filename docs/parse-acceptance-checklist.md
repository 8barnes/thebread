# SeamlessHR Appraisal Parser, Schema & ARIG Acceptance Checklist

### 1. Parser Checklist
| # | Item | Status | Verification |
|---|---|---|---|
| 1 | Fingerprint detects SeamlessHR template | [x] | `fingerprint.ts` matches $\ge 2$ signals |
| 2 | Page classification labels all page types | [x] | `pageClassify.ts` covers 9 distinct page types |
| 3 | KPI block extraction handles all formats | [x] | `extractKpi.ts` parses tables 1 & 2, comments, scores |
| 4 | Perspective extraction captures names and weights | [x] | `extractPerspective.ts` handles null weights |
| 5 | Signature extraction captures all roles | [x] | `extractSignature.ts` captures Reviewer, Counter-signer, ARC |
| 6 | HR master lookup resolves by name | [x] | `hrMasterLookup.ts` handles EXACT, MULTIPLE, NONE |
| 7 | KPI type inference runs on every KPI | [x] | `inferKpiType.ts` evaluates titles/prose |
| 8 | Artifact detection skips degenerate pages | [x] | `artifactDetect.ts` entropy $< 0.1$, tokens $> 100$ |
| 9 | Warnings emitted on anomalous input | [x] | Emits typed `ParseWarning` records |
| 10 | Confidence scores assigned per field | [x] | Computed via `ConfidenceRules` |
| 11 | Source references recorded per field | [x] | `SourceRef` (doc, page, row, field) recorded |
| 12 | Sample appraisals parse successfully | [x] | Verified in `e2e.test.ts` |

---

### 2. Schema Checklist (Phase 2 Acceptance Criteria)
| # | Item | Status | Verification |
|---|---|---|---|
| 1 | Every field defined with type and nullability | [x] | Complete in `types.ts` & `normalizedAppraisal.ts` |
| 2 | Every field carries source and confidence where applicable | [x] | Enforced on perspectives, kpis, competencies |
| 3 | Warnings have codes, severities, and context | [x] | `ParseWarning` strictly validated |
| 4 | Perspective weights captured even when null | [x] | Verified on non-standard and unweighted perspectives |
| 5 | Self/supervisor delta precomputed | [x] | `employee_actual - reviewer_actual` precalculated |
| 6 | KPI type recorded in three forms | [x] | `from_pdf`, `inferred`, and resolved `kpi_type` |
| 7 | Schema is serializable to JSON | [x] | `serializeNormalizedAppraisal` |
| 8 | Schema is stable across runs | [x] | Deterministic sorted-key serialization |
| 9 | Schema covers canonical sample | [x] | `julius_danquah_example.json` passes 100% |

---

### 3. ARIG Checklist (Phase 3 Rules 1–30)
| # | Item | Status | Verification |
|---|---|---|---|
| 1 | Rules 1–16 revised per Phase 3 | [x] | Tolerates SeamlessHR template nuances |
| 2 | Rules 17–30 added | [x] | All 30 rules implemented in `rules.ts` |
| 3 | Rule 1 tolerates name-only input | [x] | Matches via HR Master resolution |
| 4 | Rule 3 applies per perspective | [x] | Validates perspective and overall sums |
| 5 | Rule 8 soft when absent, hard when insufficient | [x] | Soft flag if empty, hard if $< 4$ |
| 6 | Rules 12–14 source from external systems | [x] | Gate 1, 2, 3 defer to Stage 7 external data |
| 7 | Rule 23 checks perspective weight sum | [x] | Validates $\sum = 100\%$ when present |
| 8 | Rule 24 checks segregation of duties | [x] | Fails HARD if Reviewer = ARC or overlaps counter-signer |
| 9 | Rule 30 raises comment threshold to 20 words | [x] | Enforces substantive prose for outlier scores |
| 10 | Quality Score uses 30-rule denominator | [x] | `(Passed / 30) * 100` |
| 11 | Hard Lock triggers only on genuine HARD failures | [x] | Hard failures or score $< 75$ |

---

### 4. End-to-End Checklist
| # | Item | Status | Verification |
|---|---|---|---|
| 1 | Julius Danquah document parses fully | [x] | Verified in `e2e.test.ts` |
| 2 | Both records pass applicable ARIG rules | [x] | Verified in test suite |
| 3 | Produces valid D1 calculation input | [x] | Type-aware and weighted KPI outputs |
| 4 | Warnings match expectations | [x] | Artifact page & type divergence flagged |
| 5 | Signatures resolve correctly | [x] | Reviewer, Counter-signer, and ARC |
| 6 | HR master matches resolve correctly | [x] | EXACT match resolution tested |
| 7 | Parse execution is non-blocking & fast | [x] | $< 1$s execution |
