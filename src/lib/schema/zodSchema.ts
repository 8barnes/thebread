/**
 * PHASE 2 — EXTENDED PARSE SCHEMA
 * Zod schema definitions for strict runtime validation and type inference.
 */

import { z } from 'zod';

export const SourceRefSchema = z.object({
    document: z.string().min(1),
    page: z.number().int().min(0),
    row: z.number().nullable(),
    field: z.string().nullable(),
});

export const DocumentMetadataSchema = z.object({
    source_filename: z.string().min(1),
    source_hash: z.string(),
    generator: z.enum(['SeamlessHR', 'ScoReview', 'Other']),
    parsed_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)),
    parser_version: z.string(),
});

export const EmployeeInfoSchema = z.object({
    employee_id: z.string().nullable(),
    name: z.string().min(1),
    department: z.string().nullable(),
    job_title: z.string().nullable(),
    hr_master_match: z.enum(['EXACT', 'MULTIPLE', 'NONE']),
});

export const CycleInfoSchema = z.object({
    label: z.string(),
    period_start: z.string(),
    period_end: z.string(),
    is_test_phase: z.boolean(),
});

export const SignatoryInfoSchema = z.object({
    name: z.string().min(1),
    department: z.string().nullable(),
    signed_at: z.string().nullable(),
});

export const PerspectiveRecordSchema = z.object({
    name: z.string().min(1),
    weight: z.number().nullable(),
    is_standard_bsc: z.boolean(),
    source: SourceRefSchema,
    confidence: z.number().min(0).max(1),
});

export const KpiTypeEnum = z.enum([
    'TYPE_1_HIGHER_BETTER',
    'TYPE_2_LESS_MEANS_MORE',
    'TYPE_3_LESS_OR_NOTHING',
    'TYPE_4_ALL_OR_NOTHING',
    'TYPE_5_NEGATIVE_SCORING',
    'TYPE_6_THRESHOLD',
    'TYPE_7_LOWER_THRESHOLD',
    'TYPE_8_RATING_SCALE',
    'UNKNOWN',
]);

export const KpiRecordSchema = z.object({
    // Identity
    code: z.string().min(1),
    title: z.string(),
    objective_text: z.string(),

    // Type
    kpi_type_from_pdf: z.string().nullable(),
    kpi_type_inferred: z.string().nullable(),
    kpi_type: KpiTypeEnum,
    kpi_type_divergence: z.boolean(),

    // Values
    target: z.number().nullable(),
    actual: z.number().nullable(),
    actual_score_from_pdf: z.number().nullable(),
    weight: z.number().nullable(),
    weighted_score_from_pdf: z.number().nullable(),
    final_score_from_pdf: z.number().nullable(),
    completion_percent: z.number().nullable(),
    unit: z.string().nullable(),

    // Perspective
    bsc_perspective: z.string(),
    perspective_weight: z.number().nullable(),

    // Reviewer / Employee
    reviewer_target: z.number().nullable(),
    reviewer_actual: z.number().nullable(),
    employee_target: z.number().nullable(),
    employee_actual: z.number().nullable(),
    self_vs_supervisor_delta: z.number().nullable(),

    // Comment
    comment: z.string().nullable(),
    comment_word_count: z.number().int().nullable(),
    comment_author: z.string().nullable(),
    comment_author_department: z.string().nullable(),
    comment_timestamp: z.string().nullable(),

    // Source & confidence
    source: SourceRefSchema,
    confidence: z.number().min(0).max(1),
}).refine(data => {
    if (data.employee_actual !== null && data.reviewer_actual !== null) {
        if (data.self_vs_supervisor_delta === null) return false;
        return Math.abs(data.self_vs_supervisor_delta - (data.employee_actual - data.reviewer_actual)) < 0.001;
    }
    return data.self_vs_supervisor_delta === null;
}, {
    message: 'self_vs_supervisor_delta must equal employee_actual - reviewer_actual when both are non-null, else null',
    path: ['self_vs_supervisor_delta'],
});

export const CompetencyRecordSchema = z.object({
    name: z.string().min(1),
    self_rating: z.number().nullable(),
    reviewer_rating: z.number().nullable(),
    reviewer_comment: z.string().nullable(),
    source: SourceRefSchema,
    confidence: z.number().min(0).max(1),
});

export const ParseWarningSchema = z.object({
    code: z.string().min(1),
    severity: z.enum(['INFO', 'WARN', 'ERROR']),
    message: z.string(),
    context: z.record(z.unknown()),
    page: z.number().int().min(0).optional(),
});

export const NormalizedAppraisalSchema = z.object({
    document: DocumentMetadataSchema,
    employee: EmployeeInfoSchema,
    cycle: CycleInfoSchema,
    reviewer: SignatoryInfoSchema,
    counter_signer: SignatoryInfoSchema.nullable(),
    arc: SignatoryInfoSchema.nullable(),
    perspectives: z.array(PerspectiveRecordSchema),
    kpis: z.array(KpiRecordSchema),
    competencies: z.array(CompetencyRecordSchema),
    warnings: z.array(ParseWarningSchema),
});
