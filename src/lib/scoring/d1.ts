/**
 * MERIDIAN ENTERPRISE PLATFORM
 * §20 & §33 — D1 Results Attainment Model & Aggregation
 * Computes individual KPI scores, perspective roll-ups, and overall D1 score.
 */

import type { NormalizedAppraisal } from '../parse/types.js';
import { scoreKpi } from './contracts.js';
import {
    D1ResultsEvaluation,
    EvaluatedKpiScore,
    PerspectiveScore,
    MeridianScoreBand,
} from './types.js';

/**
 * Maps percentage attainment (0–120%) to the Meridian 1.0–5.0 standard score scale.
 * §20.2 & §20.3
 */
export function attainmentTo5PtScore(attainment: number | null): number | null {
    if (attainment === null || Number.isNaN(attainment)) return null;

    // Linear piecewise mapping anchored to Meridian bands:
    // 0% -> 1.0 (Unsatisfactory)
    // 60% -> 2.0 (Below)
    // 80% -> 3.0 (Meets)
    // 100% -> 4.0 (Strong)
    // 120% -> 5.0 (Exceptional)
    if (attainment <= 0) return 1.0;
    if (attainment >= 120) return 5.0;

    let score: number;
    if (attainment < 60) {
        score = 1.0 + (attainment / 60) * 1.0; // 1.0 to 2.0
    } else if (attainment < 80) {
        score = 2.0 + ((attainment - 60) / 20) * 1.0; // 2.0 to 3.0
    } else if (attainment < 100) {
        score = 3.0 + ((attainment - 80) / 20) * 1.0; // 3.0 to 4.0
    } else {
        score = 4.0 + ((attainment - 100) / 20) * 1.0; // 4.0 to 5.0
    }

    return Math.round(score * 100) / 100;
}

/**
 * Maps a 1.0–5.0 score to its canonical Meridian performance category.
 * §20.2
 */
export function scoreToMeridianBand(score: number | null): MeridianScoreBand {
    if (score === null || score < 1.5) return 'UNSATISFACTORY';
    if (score < 2.5) return 'BELOW';
    if (score < 3.5) return 'MEETS';
    if (score < 4.5) return 'STRONG';
    return 'EXCEPTIONAL';
}

/**
 * Evaluates D1 Results dimension from a NormalizedAppraisal record.
 * §20.3 Hierarchical Roll-Up: KPI -> Perspective -> Overall D1
 */
export function evaluateD1(
    record: NormalizedAppraisal,
    options?: { capPolicy?: 'SOURCE_CAPPED_100' | 'MERIDIAN_120' }
): D1ResultsEvaluation {
    const capPolicy = options?.capPolicy ?? 'SOURCE_CAPPED_100';
    const evaluatedKpis: EvaluatedKpiScore[] = [];

    let notEvaluableCount = 0;

    // ─── Step 1: Score each KPI ─────────────────────────────────────────
    for (const kpi of record.kpis) {
        const result = scoreKpi({
            type: kpi.kpi_type,
            target: kpi.target,
            actual: kpi.reviewer_actual ?? kpi.actual, // prefer verified reviewer actual
            capPolicy,
        });

        if (!result.evaluable) {
            notEvaluableCount++;
        }

        const score5pt = attainmentTo5PtScore(result.score_percentage);
        const weight = kpi.weight ?? 0;
        const weightedScore = score5pt !== null ? Math.round((score5pt * (weight / 100)) * 100) / 100 : null;

        evaluatedKpis.push({
            code: kpi.code,
            title: kpi.title,
            perspective: kpi.bsc_perspective,
            kpi_type: kpi.kpi_type,
            target: kpi.target,
            actual: kpi.actual,
            weight: kpi.weight,
            attainment_percent: result.score_percentage,
            kpi_score_5pt: score5pt,
            weighted_score_5pt: weightedScore,
            status: result.status,
            evaluable: result.evaluable,
        });
    }

    // ─── Step 2: Perspective Roll-up ────────────────────────────────────
    const perspectiveMap = new Map<string, EvaluatedKpiScore[]>();
    for (const ek of evaluatedKpis) {
        const normPersp = ek.perspective.toLowerCase();
        const list = perspectiveMap.get(normPersp) ?? [];
        list.push(ek);
        perspectiveMap.set(normPersp, list);
    }

    const perspectiveScores: PerspectiveScore[] = [];
    let renormalizedWeights = false;

    // If perspective weights are explicitly defined in record
    for (const p of record.perspectives) {
        const normName = p.name.toLowerCase();
        const kpisInP = perspectiveMap.get(normName) ?? [];
        const evaluableKpis = kpisInP.filter(k => k.evaluable && k.attainment_percent !== null);

        let pAttainment: number | null = null;
        let pScore5pt: number | null = null;

        if (evaluableKpis.length > 0) {
            const sumWeights = evaluableKpis.reduce((acc, k) => acc + (k.weight ?? 0), 0);
            if (sumWeights > 0) {
                // Renormalize if some KPIs were missing weight or not evaluable
                const weightedAttainmentSum = evaluableKpis.reduce((acc, k) => {
                    const w = (k.weight ?? 0) / sumWeights;
                    return acc + (k.attainment_percent! * w);
                }, 0);
                pAttainment = Math.round(weightedAttainmentSum * 100) / 100;
                pScore5pt = attainmentTo5PtScore(pAttainment);
                if (evaluableKpis.length < kpisInP.length) {
                    renormalizedWeights = true;
                }
            } else {
                // Equal weighting fallback
                const avgAttainment = evaluableKpis.reduce((acc, k) => acc + k.attainment_percent!, 0) / evaluableKpis.length;
                pAttainment = Math.round(avgAttainment * 100) / 100;
                pScore5pt = attainmentTo5PtScore(pAttainment);
            }
        }

        const effWeight = p.weight ?? 0;
        const weightedScore = pScore5pt !== null ? Math.round((pScore5pt * (effWeight / 100)) * 100) / 100 : null;

        perspectiveScores.push({
            name: p.name,
            weight: p.weight,
            effective_weight: effWeight,
            attainment_percent: pAttainment,
            score_5pt: pScore5pt,
            weighted_score_5pt: weightedScore,
            kpi_count: kpisInP.length,
            evaluable_kpi_count: evaluableKpis.length,
        });
    }

    // ─── Step 3: Overall D1 Roll-up ─────────────────────────────────────
    let overallAttainment: number | null = null;
    let overallScore5pt: number | null = null;

    const evaluablePerspectives = perspectiveScores.filter(ps => ps.attainment_percent !== null && ps.score_5pt !== null);
    if (evaluablePerspectives.length > 0) {
        const sumPerspWeights = evaluablePerspectives.reduce((acc, ps) => acc + ps.effective_weight, 0);

        if (sumPerspWeights > 0) {
            const weightedAtt = evaluablePerspectives.reduce((acc, ps) => {
                const w = ps.effective_weight / sumPerspWeights;
                return acc + (ps.attainment_percent! * w);
            }, 0);
            overallAttainment = Math.round(weightedAtt * 100) / 100;
            overallScore5pt = attainmentTo5PtScore(overallAttainment);
        } else {
            // Direct overall average from evaluable KPIs if perspective weights are zero
            const evaluableAllKpis = evaluatedKpis.filter(k => k.evaluable && k.attainment_percent !== null);
            if (evaluableAllKpis.length > 0) {
                const totalKpiWeight = evaluableAllKpis.reduce((acc, k) => acc + (k.weight ?? 0), 0);
                if (totalKpiWeight > 0) {
                    const weighted = evaluableAllKpis.reduce((acc, k) => acc + (k.attainment_percent! * ((k.weight ?? 0) / totalKpiWeight)), 0);
                    overallAttainment = Math.round(weighted * 100) / 100;
                } else {
                    const avg = evaluableAllKpis.reduce((acc, k) => acc + k.attainment_percent!, 0) / evaluableAllKpis.length;
                    overallAttainment = Math.round(avg * 100) / 100;
                }
                overallScore5pt = attainmentTo5PtScore(overallAttainment);
            }
        }
    }

    const confidencePenalty = Math.min(notEvaluableCount * 0.05, 0.40);
    const category = scoreToMeridianBand(overallScore5pt);

    return {
        kpi_scores: evaluatedKpis,
        perspective_scores: perspectiveScores,
        overall_attainment_percent: overallAttainment,
        overall_d1_score_5pt: overallScore5pt,
        category,
        not_evaluable_count: notEvaluableCount,
        renormalized_weights: renormalizedWeights,
        confidence_penalty: confidencePenalty,
    };
}
