/**
 * PHASE 2 — EXTENDED PARSE SCHEMA
 * Canonical type definitions for SeamlessHR appraisal parsing.
 */

export type DocumentGenerator = 'SeamlessHR' | 'ScoReview' | 'Other';

export type HrMasterMatchStatus = 'EXACT' | 'MULTIPLE' | 'NONE';

export type WarningSeverity = 'INFO' | 'WARN' | 'ERROR';

export type WarningCode =
    | 'WARN_ARTIFACT_PAGE'
    | 'WARN_TABLE_UNRESOLVED'
    | 'WARN_MISSING_WEIGHT'
    | 'WARN_MISSING_WEIGHTED_SCORE'
    | 'WARN_PERSPECTIVE_WEIGHT_ABSENT'
    | 'WARN_NON_STANDARD_PERSPECTIVE'
    | 'KPI_TYPE_DIVERGENCE'
    | 'KPI_TYPE_UNRESOLVED'
    | 'MULTIPLE_HR_MATCHES'
    | 'NO_HR_MATCH'
    | 'ERR_NOT_SEAMLESSHR_TEMPLATE'
    | 'ERR_NO_EMPLOYEE_NAME'
    | 'ERR_NO_REVIEWER'
    | 'ERR_NO_KPIS'
    | 'WARN_CYCLE_PERIOD_MISMATCH';

export type KpiType =
    | 'TYPE_1_HIGHER_BETTER'
    | 'TYPE_2_LESS_MEANS_MORE'
    | 'TYPE_3_LESS_OR_NOTHING'
    | 'TYPE_4_ALL_OR_NOTHING'
    | 'TYPE_5_NEGATIVE_SCORING'
    | 'TYPE_6_THRESHOLD'
    | 'TYPE_7_LOWER_THRESHOLD'
    | 'TYPE_8_RATING_SCALE'
    | 'UNKNOWN';

export interface SourceRef {
    document: string;
    page: number;
    row: number | null;
    field: string | null;
}

export interface ParseWarning {
    code: WarningCode | string;
    severity: WarningSeverity;
    message: string;
    context: Record<string, unknown>;
    page?: number;
}

export interface PerspectiveRecord {
    name: string;
    weight: number | null;
    is_standard_bsc: boolean;
    source: SourceRef;
    confidence: number;
}

export interface KpiRecord {
    // ─── IDENTITY ─────────────────────────────────────────
    code: string;                       // e.g. "KPI-01"
    title: string;
    objective_text: string;

    // ─── TYPE ─────────────────────────────────────────────
    kpi_type_from_pdf: string | null;   // e.g. "Type 1" verbatim from PDF
    kpi_type_inferred: string | null;   // inferred from title/prose
    kpi_type: KpiType;                  // resolved: from_pdf, inferred, or UNKNOWN
    kpi_type_divergence: boolean;       // true if from_pdf ≠ inferred

    // ─── VALUES ───────────────────────────────────────────
    target: number | null;
    actual: number | null;
    actual_score_from_pdf: number | null;
    weight: number | null;
    weighted_score_from_pdf: number | null;
    final_score_from_pdf: number | null;
    completion_percent: number | null;
    unit: string | null;

    // ─── PERSPECTIVE ──────────────────────────────────────
    bsc_perspective: string;            // e.g. "financial"
    perspective_weight: number | null;

    // ─── REVIEWER / EMPLOYEE ──────────────────────────────
    reviewer_target: number | null;
    reviewer_actual: number | null;     // supervisor score
    employee_target: number | null;
    employee_actual: number | null;     // self score
    self_vs_supervisor_delta: number | null;   // employee_actual - reviewer_actual

    // ─── COMMENT ──────────────────────────────────────────
    comment: string | null;
    comment_word_count: number | null;
    comment_author: string | null;
    comment_author_department: string | null;
    comment_timestamp: string | null;

    // ─── SOURCE & CONFIDENCE ──────────────────────────────
    source: SourceRef;
    confidence: number;                 // 0.0 - 1.0
}

export interface CompetencyRecord {
    name: string;
    self_rating: number | null;
    reviewer_rating: number | null;
    reviewer_comment: string | null;
    source: SourceRef;
    confidence: number;
}

export interface DocumentMetadata {
    source_filename: string;
    source_hash: string;                // SHA-256
    generator: DocumentGenerator;
    parsed_at: string;                  // ISO 8601
    parser_version: string;
}

export interface EmployeeInfo {
    employee_id: string | null;         // from HR master lookup
    name: string;
    department: string | null;
    job_title: string | null;
    hr_master_match: HrMasterMatchStatus;
}

export interface CycleInfo {
    label: string;                      // e.g. "Q1 2026"
    period_start: string;               // ISO 8601 date, e.g. "2026-01-01"
    period_end: string;                 // ISO 8601 date, e.g. "2026-05-31"
    is_test_phase: boolean;
}

export interface SignatoryInfo {
    name: string;
    department: string | null;
    signed_at: string | null;           // ISO 8601 or null
}

export interface NormalizedAppraisal {
    // ─── METADATA ─────────────────────────────────────────
    document: DocumentMetadata;

    // ─── EMPLOYEE ─────────────────────────────────────────
    employee: EmployeeInfo;

    // ─── CYCLE ────────────────────────────────────────────
    cycle: CycleInfo;

    // ─── REVIEWER / SIGNATURES ────────────────────────────
    reviewer: SignatoryInfo;
    counter_signer: SignatoryInfo | null;
    arc: SignatoryInfo | null;

    // ─── PERSPECTIVES ─────────────────────────────────────
    perspectives: PerspectiveRecord[];

    // ─── KPIS ─────────────────────────────────────────────
    kpis: KpiRecord[];

    // ─── COMPETENCIES ─────────────────────────────────────
    competencies: CompetencyRecord[];

    // ─── WARNINGS ─────────────────────────────────────────
    warnings: ParseWarning[];
}
