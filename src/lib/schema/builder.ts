/**
 * PHASE 2 — EXTENDED PARSE SCHEMA
 * Fluent builder and normalization factory for NormalizedAppraisal and KpiRecord.
 */

import type {
    KpiRecord,
    PerspectiveRecord,
    SourceRef,
    KpiType,
} from '../parse/types.js';
import { ConfidenceRules } from './confidence.js';
import { STANDARD_BSC_PERSPECTIVES } from './normalizedAppraisal.js';

export interface CreateKpiInput {
    code: string;
    title: string;
    objective_text: string;
    kpi_type_from_pdf: string | null;
    kpi_type_inferred: string | null;
    target: number | null;
    actual: number | null;
    actual_score_from_pdf?: number | null;
    weight: number | null;
    weighted_score_from_pdf?: number | null;
    final_score_from_pdf?: number | null;
    completion_percent?: number | null;
    unit?: string | null;
    bsc_perspective: string;
    perspective_weight?: number | null;
    reviewer_target?: number | null;
    reviewer_actual?: number | null;
    employee_target?: number | null;
    employee_actual?: number | null;
    comment?: string | null;
    comment_author?: string | null;
    comment_author_department?: string | null;
    comment_timestamp?: string | null;
    source: SourceRef;
    confidence?: number;
}

export function buildKpiRecord(input: CreateKpiInput): KpiRecord {
    // 1. Resolve KPI type and divergence (Criteria 6)
    const KPI_TYPE_MAP: Record<string, KpiType> = {
        'type 1': 'TYPE_1_HIGHER_BETTER',
        'type 2': 'TYPE_2_LESS_MEANS_MORE',
        'type 3': 'TYPE_3_LESS_OR_NOTHING',
        'type 4': 'TYPE_4_ALL_OR_NOTHING',
        'type 5': 'TYPE_5_NEGATIVE_SCORING',
        'type 6': 'TYPE_6_THRESHOLD',
        'type 7': 'TYPE_7_LOWER_THRESHOLD',
        'type 8': 'TYPE_8_RATING_SCALE',
    };

    const kpi_type_from_pdf = input.kpi_type_from_pdf;
    const kpi_type_inferred = input.kpi_type_inferred;

    const normPdf = kpi_type_from_pdf ? (KPI_TYPE_MAP[kpi_type_from_pdf.toLowerCase()] ?? kpi_type_from_pdf) : null;
    const normInf = kpi_type_inferred ? (KPI_TYPE_MAP[kpi_type_inferred.toLowerCase()] ?? kpi_type_inferred) : null;

    let kpi_type: KpiType = 'UNKNOWN';
    let divergence = false;

    if (normPdf && normInf) {
        if (normPdf.toLowerCase() === normInf.toLowerCase()) {
            kpi_type = normPdf as KpiType;
            divergence = false;
        } else {
            // Divergence: use inferred as primary, flag divergence
            kpi_type = (normInf as KpiType) || 'UNKNOWN';
            divergence = true;
        }
    } else if (normInf) {
        kpi_type = normInf as KpiType;
        divergence = false;
    } else if (normPdf) {
        kpi_type = (normPdf as KpiType) || 'UNKNOWN';
        divergence = false;
    }

    // 2. Precompute self_vs_supervisor_delta (Criteria 5)
    let self_vs_supervisor_delta: number | null = null;
    const empActual = input.employee_actual ?? null;
    const revActual = input.reviewer_actual ?? null;
    if (empActual !== null && revActual !== null) {
        self_vs_supervisor_delta = empActual - revActual;
    }

    // 3. Comment word count
    const comment = input.comment ?? null;
    const comment_word_count = comment && comment.trim().length > 0
        ? comment.trim().split(/\s+/).length
        : null;

    // 4. Confidence calculation if not explicitly provided
    const confidence = input.confidence ?? ConfidenceRules.computeKpiConfidence({
        targetParsedCleanly: input.target !== null,
        actualParsedCleanly: input.actual !== null,
        weightPresent: input.weight !== null,
        hasComment: Boolean(comment),
        commentHasProse: Boolean(comment && comment_word_count && comment_word_count > 5),
    });

    return {
        code: input.code,
        title: input.title,
        objective_text: input.objective_text,
        kpi_type_from_pdf,
        kpi_type_inferred,
        kpi_type,
        kpi_type_divergence: divergence,
        target: input.target,
        actual: input.actual,
        actual_score_from_pdf: input.actual_score_from_pdf ?? null,
        weight: input.weight,
        weighted_score_from_pdf: input.weighted_score_from_pdf ?? null,
        final_score_from_pdf: input.final_score_from_pdf ?? null,
        completion_percent: input.completion_percent ?? null,
        unit: input.unit ?? null,
        bsc_perspective: input.bsc_perspective,
        perspective_weight: input.perspective_weight ?? null,
        reviewer_target: input.reviewer_target ?? null,
        reviewer_actual: revActual,
        employee_target: input.employee_target ?? null,
        employee_actual: empActual,
        self_vs_supervisor_delta,
        comment,
        comment_word_count,
        comment_author: input.comment_author ?? null,
        comment_author_department: input.comment_author_department ?? null,
        comment_timestamp: input.comment_timestamp ?? null,
        source: input.source,
        confidence,
    };
}

export function buildPerspectiveRecord(params: {
    name: string;
    weight: number | null;
    source: SourceRef;
    confidence?: number;
}): PerspectiveRecord {
    const isStandard = STANDARD_BSC_PERSPECTIVES.includes(params.name.trim().toLowerCase());
    return {
        name: params.name,
        weight: params.weight, // Criteria 4: weight captured even when null
        is_standard_bsc: isStandard,
        source: params.source,
        confidence: params.confidence ?? (params.weight !== null ? 1.0 : 0.0),
    };
}
