/**
 * PHASE 2 — EXTENDED PARSE SCHEMA
 * Runtime validation, JSON serialization, and stability helpers.
 */

import type {
    NormalizedAppraisal,
    KpiType,
    WarningCode,
    WarningSeverity,
    DocumentGenerator,
    HrMasterMatchStatus,
} from '../parse/types.js';

export const STANDARD_BSC_PERSPECTIVES = [
    'financial',
    'customer',
    'internal_process',
    'learning_growth',
    'learning and growth',
    'internal processes',
    'internal business processes',
];

export const VALID_KPI_TYPES: KpiType[] = [
    'TYPE_1_HIGHER_BETTER',
    'TYPE_2_LESS_MEANS_MORE',
    'TYPE_3_LESS_OR_NOTHING',
    'TYPE_4_ALL_OR_NOTHING',
    'TYPE_5_NEGATIVE_SCORING',
    'TYPE_6_THRESHOLD',
    'TYPE_7_LOWER_THRESHOLD',
    'TYPE_8_RATING_SCALE',
    'UNKNOWN',
];

export const VALID_WARNING_SEVERITIES: WarningSeverity[] = ['INFO', 'WARN', 'ERROR'];

export const VALID_WARNING_CODES: WarningCode[] = [
    'WARN_ARTIFACT_PAGE',
    'WARN_TABLE_UNRESOLVED',
    'WARN_MISSING_WEIGHT',
    'WARN_MISSING_WEIGHTED_SCORE',
    'WARN_PERSPECTIVE_WEIGHT_ABSENT',
    'WARN_NON_STANDARD_PERSPECTIVE',
    'KPI_TYPE_DIVERGENCE',
    'KPI_TYPE_UNRESOLVED',
    'MULTIPLE_HR_MATCHES',
    'NO_HR_MATCH',
    'ERR_NOT_SEAMLESSHR_TEMPLATE',
    'ERR_NO_EMPLOYEE_NAME',
    'ERR_NO_REVIEWER',
    'ERR_NO_KPIS',
    'WARN_CYCLE_PERIOD_MISMATCH',
];

export interface ValidationIssue {
    path: string;
    message: string;
    value?: unknown;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationIssue[];
}

/**
 * Validates a SourceRef object.
 */
export function validateSourceRef(source: unknown, path: string, errors: ValidationIssue[]): void {
    if (!source || typeof source !== 'object') {
        errors.push({ path, message: 'SourceRef must be a non-null object', value: source });
        return;
    }
    const s = source as Record<string, unknown>;
    if (typeof s.document !== 'string' || s.document.length === 0) {
        errors.push({ path: `${path}.document`, message: 'document must be a non-empty string', value: s.document });
    }
    if (typeof s.page !== 'number' || !Number.isInteger(s.page) || s.page < 0) {
        errors.push({ path: `${path}.page`, message: 'page must be a non-negative integer', value: s.page });
    }
    if (s.row !== null && typeof s.row !== 'undefined' && typeof s.row !== 'number') {
        errors.push({ path: `${path}.row`, message: 'row must be a number or null', value: s.row });
    }
    if (s.field !== null && typeof s.field !== 'undefined' && typeof s.field !== 'string') {
        errors.push({ path: `${path}.field`, message: 'field must be a string or null', value: s.field });
    }
}

/**
 * Validates a Confidence score (0.0 to 1.0).
 */
export function validateConfidence(conf: unknown, path: string, errors: ValidationIssue[]): void {
    if (typeof conf !== 'number' || Number.isNaN(conf) || conf < 0 || conf > 1) {
        errors.push({ path, message: 'Confidence must be a number between 0.0 and 1.0', value: conf });
    }
}

/**
 * Validates a single KpiRecord according to Phase 2 criteria.
 */
export function validateKpiRecord(kpi: unknown, index: number, errors: ValidationIssue[]): void {
    const path = `kpis[${index}]`;
    if (!kpi || typeof kpi !== 'object') {
        errors.push({ path, message: 'KpiRecord must be an object', value: kpi });
        return;
    }
    const k = kpi as Record<string, unknown>;

    // Identity
    if (typeof k.code !== 'string' || k.code.trim().length === 0) {
        errors.push({ path: `${path}.code`, message: 'code must be a non-empty string (e.g. KPI-01)', value: k.code });
    }
    if (typeof k.title !== 'string') {
        errors.push({ path: `${path}.title`, message: 'title must be a string', value: k.title });
    }
    if (typeof k.objective_text !== 'string') {
        errors.push({ path: `${path}.objective_text`, message: 'objective_text must be a string', value: k.objective_text });
    }

    // Type fields (Criteria 6: recorded in three forms)
    if (k.kpi_type_from_pdf !== null && typeof k.kpi_type_from_pdf !== 'string') {
        errors.push({ path: `${path}.kpi_type_from_pdf`, message: 'kpi_type_from_pdf must be string or null', value: k.kpi_type_from_pdf });
    }
    if (k.kpi_type_inferred !== null && typeof k.kpi_type_inferred !== 'string') {
        errors.push({ path: `${path}.kpi_type_inferred`, message: 'kpi_type_inferred must be string or null', value: k.kpi_type_inferred });
    }
    if (!VALID_KPI_TYPES.includes(k.kpi_type as KpiType)) {
        errors.push({ path: `${path}.kpi_type`, message: `kpi_type must be one of ${VALID_KPI_TYPES.join(', ')}`, value: k.kpi_type });
    }
    if (typeof k.kpi_type_divergence !== 'boolean') {
        errors.push({ path: `${path}.kpi_type_divergence`, message: 'kpi_type_divergence must be boolean', value: k.kpi_type_divergence });
    }

    // Values & nullability
    const numericOrNullFields = [
        'target',
        'actual',
        'actual_score_from_pdf',
        'weight',
        'weighted_score_from_pdf',
        'final_score_from_pdf',
        'completion_percent',
        'perspective_weight',
        'reviewer_target',
        'reviewer_actual',
        'employee_target',
        'employee_actual',
    ];
    for (const field of numericOrNullFields) {
        const val = k[field];
        if (val !== null && typeof val !== 'number') {
            errors.push({ path: `${path}.${field}`, message: `${field} must be number or null`, value: val });
        }
    }

    // Criteria 5: self_vs_supervisor_delta precomputed (employee_actual - reviewer_actual)
    if (typeof k.employee_actual === 'number' && typeof k.reviewer_actual === 'number') {
        const expectedDelta = k.employee_actual - k.reviewer_actual;
        if (typeof k.self_vs_supervisor_delta !== 'number') {
            errors.push({
                path: `${path}.self_vs_supervisor_delta`,
                message: `self_vs_supervisor_delta must be precomputed as ${expectedDelta} when both scores exist`,
                value: k.self_vs_supervisor_delta,
            });
        } else if (Math.abs(k.self_vs_supervisor_delta - expectedDelta) > 0.001) {
            errors.push({
                path: `${path}.self_vs_supervisor_delta`,
                message: `self_vs_supervisor_delta (${k.self_vs_supervisor_delta}) does not match expected (${expectedDelta})`,
                value: k.self_vs_supervisor_delta,
            });
        }
    } else {
        if (k.self_vs_supervisor_delta !== null && typeof k.self_vs_supervisor_delta !== 'undefined') {
            errors.push({
                path: `${path}.self_vs_supervisor_delta`,
                message: 'self_vs_supervisor_delta must be null when either employee_actual or reviewer_actual is null',
                value: k.self_vs_supervisor_delta,
            });
        }
    }

    // Comments & metadata
    if (k.comment !== null && typeof k.comment !== 'string') {
        errors.push({ path: `${path}.comment`, message: 'comment must be string or null', value: k.comment });
    }
    if (k.comment_word_count !== null && typeof k.comment_word_count !== 'number') {
        errors.push({ path: `${path}.comment_word_count`, message: 'comment_word_count must be number or null', value: k.comment_word_count });
    }

    // Source and confidence (Criteria 2)
    validateSourceRef(k.source, `${path}.source`, errors);
    validateConfidence(k.confidence, `${path}.confidence`, errors);
}

/**
 * Validates a PerspectiveRecord.
 */
export function validatePerspective(p: unknown, index: number, errors: ValidationIssue[]): void {
    const path = `perspectives[${index}]`;
    if (!p || typeof p !== 'object') {
        errors.push({ path, message: 'Perspective must be an object', value: p });
        return;
    }
    const rec = p as Record<string, unknown>;
    if (typeof rec.name !== 'string' || rec.name.trim().length === 0) {
        errors.push({ path: `${path}.name`, message: 'name must be a non-empty string', value: rec.name });
    }
    // Criteria 4: weight captured even when null
    if (rec.weight !== null && typeof rec.weight !== 'number') {
        errors.push({ path: `${path}.weight`, message: 'weight must be number or null', value: rec.weight });
    }
    if (typeof rec.is_standard_bsc !== 'boolean') {
        errors.push({ path: `${path}.is_standard_bsc`, message: 'is_standard_bsc must be boolean', value: rec.is_standard_bsc });
    }
    validateSourceRef(rec.source, `${path}.source`, errors);
    validateConfidence(rec.confidence, `${path}.confidence`, errors);
}

/**
 * Validates a CompetencyRecord.
 */
export function validateCompetency(c: unknown, index: number, errors: ValidationIssue[]): void {
    const path = `competencies[${index}]`;
    if (!c || typeof c !== 'object') {
        errors.push({ path, message: 'Competency must be an object', value: c });
        return;
    }
    const rec = c as Record<string, unknown>;
    if (typeof rec.name !== 'string' || rec.name.trim().length === 0) {
        errors.push({ path: `${path}.name`, message: 'name must be non-empty string', value: rec.name });
    }
    if (rec.self_rating !== null && typeof rec.self_rating !== 'number') {
        errors.push({ path: `${path}.self_rating`, message: 'self_rating must be number or null', value: rec.self_rating });
    }
    if (rec.reviewer_rating !== null && typeof rec.reviewer_rating !== 'number') {
        errors.push({ path: `${path}.reviewer_rating`, message: 'reviewer_rating must be number or null', value: rec.reviewer_rating });
    }
    if (rec.reviewer_comment !== null && typeof rec.reviewer_comment !== 'string') {
        errors.push({ path: `${path}.reviewer_comment`, message: 'reviewer_comment must be string or null', value: rec.reviewer_comment });
    }
    validateSourceRef(rec.source, `${path}.source`, errors);
    validateConfidence(rec.confidence, `${path}.confidence`, errors);
}

/**
 * Validates a ParseWarning (Criteria 3).
 */
export function validateWarning(w: unknown, index: number, errors: ValidationIssue[]): void {
    const path = `warnings[${index}]`;
    if (!w || typeof w !== 'object') {
        errors.push({ path, message: 'Warning must be an object', value: w });
        return;
    }
    const rec = w as Record<string, unknown>;
    if (typeof rec.code !== 'string' || rec.code.trim().length === 0) {
        errors.push({ path: `${path}.code`, message: 'code must be non-empty string', value: rec.code });
    }
    if (!VALID_WARNING_SEVERITIES.includes(rec.severity as WarningSeverity)) {
        errors.push({ path: `${path}.severity`, message: `severity must be one of ${VALID_WARNING_SEVERITIES.join(', ')}`, value: rec.severity });
    }
    if (typeof rec.message !== 'string') {
        errors.push({ path: `${path}.message`, message: 'message must be string', value: rec.message });
    }
    if (!rec.context || typeof rec.context !== 'object') {
        errors.push({ path: `${path}.context`, message: 'context must be an object', value: rec.context });
    }
    if (rec.page !== undefined && (typeof rec.page !== 'number' || rec.page < 0)) {
        errors.push({ path: `${path}.page`, message: 'page must be a non-negative number if present', value: rec.page });
    }
}

/**
 * Canonical validator for NormalizedAppraisal covering all Phase 2 criteria.
 */
export function validateNormalizedAppraisal(record: unknown): ValidationResult {
    const errors: ValidationIssue[] = [];

    if (!record || typeof record !== 'object') {
        return { valid: false, errors: [{ path: 'root', message: 'Record must be an object', value: record }] };
    }

    const r = record as Record<string, unknown>;

    // 1. Document metadata
    if (!r.document || typeof r.document !== 'object') {
        errors.push({ path: 'document', message: 'document metadata is required' });
    } else {
        const d = r.document as Record<string, unknown>;
        if (typeof d.source_filename !== 'string' || d.source_filename.length === 0) {
            errors.push({ path: 'document.source_filename', message: 'source_filename must be non-empty string' });
        }
        if (typeof d.source_hash !== 'string') {
            errors.push({ path: 'document.source_hash', message: 'source_hash must be string' });
        }
        const validGens: DocumentGenerator[] = ['SeamlessHR', 'ScoReview', 'Other'];
        if (!validGens.includes(d.generator as DocumentGenerator)) {
            errors.push({ path: 'document.generator', message: `generator must be one of ${validGens.join(', ')}` });
        }
        if (typeof d.parsed_at !== 'string' || Number.isNaN(Date.parse(d.parsed_at))) {
            errors.push({ path: 'document.parsed_at', message: 'parsed_at must be valid ISO 8601 string' });
        }
        if (typeof d.parser_version !== 'string') {
            errors.push({ path: 'document.parser_version', message: 'parser_version must be string' });
        }
    }

    // 2. Employee
    if (!r.employee || typeof r.employee !== 'object') {
        errors.push({ path: 'employee', message: 'employee info is required' });
    } else {
        const e = r.employee as Record<string, unknown>;
        if (typeof e.name !== 'string' || e.name.trim().length === 0) {
            errors.push({ path: 'employee.name', message: 'name must be non-empty string' });
        }
        if (e.employee_id !== null && typeof e.employee_id !== 'string') {
            errors.push({ path: 'employee.employee_id', message: 'employee_id must be string or null' });
        }
        const validMatches: HrMasterMatchStatus[] = ['EXACT', 'MULTIPLE', 'NONE'];
        if (!validMatches.includes(e.hr_master_match as HrMasterMatchStatus)) {
            errors.push({ path: 'employee.hr_master_match', message: `hr_master_match must be one of ${validMatches.join(', ')}` });
        }
    }

    // 3. Cycle
    if (!r.cycle || typeof r.cycle !== 'object') {
        errors.push({ path: 'cycle', message: 'cycle info is required' });
    } else {
        const c = r.cycle as Record<string, unknown>;
        if (typeof c.label !== 'string') errors.push({ path: 'cycle.label', message: 'label must be string' });
        if (typeof c.period_start !== 'string') errors.push({ path: 'cycle.period_start', message: 'period_start must be string' });
        if (typeof c.period_end !== 'string') errors.push({ path: 'cycle.period_end', message: 'period_end must be string' });
        if (typeof c.is_test_phase !== 'boolean') errors.push({ path: 'cycle.is_test_phase', message: 'is_test_phase must be boolean' });
    }

    // 4. Reviewer & signatures
    if (!r.reviewer || typeof r.reviewer !== 'object') {
        errors.push({ path: 'reviewer', message: 'reviewer is required' });
    } else {
        const rev = r.reviewer as Record<string, unknown>;
        if (typeof rev.name !== 'string' || rev.name.trim().length === 0) {
            errors.push({ path: 'reviewer.name', message: 'reviewer.name must be non-empty string' });
        }
    }
    if (r.counter_signer !== null && r.counter_signer !== undefined) {
        const cs = r.counter_signer as Record<string, unknown>;
        if (typeof cs.name !== 'string') errors.push({ path: 'counter_signer.name', message: 'counter_signer.name must be string' });
    }
    if (r.arc !== null && r.arc !== undefined) {
        const arc = r.arc as Record<string, unknown>;
        if (typeof arc.name !== 'string') errors.push({ path: 'arc.name', message: 'arc.name must be string' });
    }

    // 5. Perspectives array
    if (!Array.isArray(r.perspectives)) {
        errors.push({ path: 'perspectives', message: 'perspectives must be an array' });
    } else {
        r.perspectives.forEach((p, idx) => validatePerspective(p, idx, errors));
    }

    // 6. KPIs array
    if (!Array.isArray(r.kpis)) {
        errors.push({ path: 'kpis', message: 'kpis must be an array' });
    } else {
        r.kpis.forEach((k, idx) => validateKpiRecord(k, idx, errors));
    }

    // 7. Competencies array
    if (!Array.isArray(r.competencies)) {
        errors.push({ path: 'competencies', message: 'competencies must be an array' });
    } else {
        r.competencies.forEach((c, idx) => validateCompetency(c, idx, errors));
    }

    // 8. Warnings array
    if (!Array.isArray(r.warnings)) {
        errors.push({ path: 'warnings', message: 'warnings must be an array' });
    } else {
        r.warnings.forEach((w, idx) => validateWarning(w, idx, errors));
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Ensures deterministic, sorted-key JSON serialization (Criteria 7 & 8).
 */
export function serializeNormalizedAppraisal(record: NormalizedAppraisal): string {
    const seen = new WeakSet();

    function sortObjectKeys(obj: unknown): unknown {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (seen.has(obj)) {
            throw new Error('Circular reference detected in record serialization');
        }
        seen.add(obj);

        if (Array.isArray(obj)) {
            return obj.map(sortObjectKeys);
        }

        const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
        const result: Record<string, unknown> = {};
        for (const key of sortedKeys) {
            result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
        }
        return result;
    }

    const sorted = sortObjectKeys(record);
    return JSON.stringify(sorted, null, 2);
}

/**
 * Deserializes JSON string to NormalizedAppraisal with structural validation.
 */
export function deserializeNormalizedAppraisal(jsonStr: string): NormalizedAppraisal {
    const parsed = JSON.parse(jsonStr);
    const result = validateNormalizedAppraisal(parsed);
    if (!result.valid) {
        const msgs = result.errors.map(e => `[${e.path}] ${e.message}`).join('; ');
        throw new Error(`Failed to validate NormalizedAppraisal: ${msgs}`);
    }
    return parsed as NormalizedAppraisal;
}
