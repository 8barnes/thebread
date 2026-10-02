/**
 * MERIDIAN ENTERPRISE PLATFORM
 * §9 & §21 — Dual-Score Architecture & Reconciliation
 * Preserves 5 distinct score concepts and validates ±1.0 reconciliation tolerance.
 */

import type { NormalizedAppraisal } from '../parse/types.js';
import type { D1ResultsEvaluation, DualScoreReconciliation } from './types.js';

export function reconcileScores(
    record: NormalizedAppraisal,
    d1: D1ResultsEvaluation
): DualScoreReconciliation {
    // 1. Employee self score average across KPIs
    const employeeScores = record.kpis
        .map(k => k.employee_actual)
        .filter((v): v is number => v !== null && !Number.isNaN(v));
    const self_score = employeeScores.length > 0
        ? Math.round((employeeScores.reduce((a, b) => a + b, 0) / employeeScores.length) * 100) / 100
        : null;

    // 2. Supervisor / reviewer score average across KPIs
    const reviewerScores = record.kpis
        .map(k => k.reviewer_actual)
        .filter((v): v is number => v !== null && !Number.isNaN(v));
    const supervisor_score = reviewerScores.length > 0
        ? Math.round((reviewerScores.reduce((a, b) => a + b, 0) / reviewerScores.length) * 100) / 100
        : null;

    // 3. Source score: sum of final_score_from_pdf across KPIs (SeamlessHR output)
    const sourceFinalScores = record.kpis
        .map(k => k.final_score_from_pdf)
        .filter((v): v is number => v !== null && !Number.isNaN(v));
    const source_score = sourceFinalScores.length > 0
        ? Math.round(sourceFinalScores.reduce((a, b) => a + b, 0) * 100) / 100
        : null;

    // 4. Meridian evidence score from D1
    const meridian_evidence_score = d1.overall_attainment_percent;

    // 5. Delta & reconciliation tolerance (§9 & §21: ±1.0 tolerance)
    let delta: number | null = null;
    let within_tolerance = true;
    let material_difference = false;
    const policy_differences: string[] = [];

    if (source_score !== null && meridian_evidence_score !== null) {
        delta = Math.round(Math.abs(source_score - meridian_evidence_score) * 100) / 100;
        if (delta > 1.0) {
            within_tolerance = false;
            material_difference = true;
            policy_differences.push(
                `Material difference (${delta}%) exceeds ±1.0 tolerance between source (${source_score}) and Meridian (${meridian_evidence_score})`
            );
        }
    }

    if (d1.renormalized_weights) {
        policy_differences.push('Weights renormalized due to NOT_EVALUABLE or unassigned KPIs');
    }

    return {
        self_score,
        supervisor_score,
        source_score,
        meridian_evidence_score,
        source_vs_meridian_delta: delta,
        within_tolerance,
        material_difference_flag: material_difference,
        policy_differences,
    };
}
