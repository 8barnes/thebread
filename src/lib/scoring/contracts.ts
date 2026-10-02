/**
 * MERIDIAN ENTERPRISE PLATFORM
 * §18 — KPI Type Scoring Contracts
 * Explicit, non-invented scoring algorithms for all eight confirmed KPI types.
 */

import { KpiScoringInput, KpiScoringResult } from './types.js';

export function scoreKpi(input: KpiScoringInput): KpiScoringResult {
    const { type, target, actual, threshold, capPolicy = 'SOURCE_CAPPED_100', rating_scale } = input;

    // ─── 1. Missing Value Check (§18.3 Item 4) ──────────────────────────
    if (target === null || target === undefined || actual === null || actual === undefined) {
        return {
            type,
            target,
            actual,
            attainment_percent: null,
            score_percentage: null,
            status: 'NOT_EVALUABLE',
            evaluable: false,
            is_cliff: type === 'TYPE_3_LESS_OR_NOTHING' || type === 'TYPE_4_ALL_OR_NOTHING',
            notes: ['Target or actual value missing — evaluated as NOT_EVALUABLE'],
        };
    }

    // ─── 2. Zero-Target Handling (§18.3 Item 1) ─────────────────────────
    if (target === 0) {
        if (actual === 0) {
            return {
                type,
                target,
                actual,
                attainment_percent: 100,
                score_percentage: 100,
                status: 'CONFIRMED',
                evaluable: true,
                is_cliff: false,
                notes: ['Zero target and zero actual achieves 100% full score (§18.3)'],
            };
        }
        // Target 0 with positive actual is undefined in source text
        return {
            type,
            target,
            actual,
            attainment_percent: null,
            score_percentage: null,
            status: 'NOT_EVALUABLE',
            evaluable: false,
            is_cliff: false,
            notes: ['Zero target with non-zero actual is undefined in source — NOT_EVALUABLE'],
        };
    }

    const maxCap = capPolicy === 'MERIDIAN_120' ? 120 : 100;

    // ─── 3. Per-Type Contracts (§18.2) ──────────────────────────────────
    switch (type) {
        case 'TYPE_1_HIGHER_BETTER': {
            if (actual >= target) {
                const uncapped = (actual / target) * 100;
                const score = Math.min(uncapped, maxCap);
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: uncapped,
                    score_percentage: score,
                    status: 'CONFIRMED',
                    evaluable: true,
                    is_cliff: false,
                    notes: [score === 100 ? 'Target achieved (full score)' : `Overachieved (${score}%)`],
                };
            }
            const s = (actual / target) * 100;
            return {
                type,
                target,
                actual,
                attainment_percent: s,
                score_percentage: Math.max(0, s),
                status: 'PENDING_CONFIRMATION',
                evaluable: true,
                is_cliff: false,
                notes: ['Below target: working reading s = (actual ÷ target) × 100'],
            };
        }

        case 'TYPE_2_LESS_MEANS_MORE': {
            if (actual <= target) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: 100,
                    score_percentage: 100,
                    status: 'CONFIRMED',
                    evaluable: true,
                    is_cliff: false,
                    notes: ['Result less than or equal to target achieves full score (CONFIRMED)'],
                };
            }
            // Above target: graded decrease (cliff variant is Type 3)
            const ratio = (target / actual) * 100;
            const s = Math.max(0, Math.min(ratio, 100));
            return {
                type,
                target,
                actual,
                attainment_percent: s,
                score_percentage: s,
                status: 'PENDING_CONFIRMATION',
                evaluable: true,
                is_cliff: false,
                notes: ['Above target: graded inverse proportional working reading'],
            };
        }

        case 'TYPE_3_LESS_OR_NOTHING': {
            // Cliff precision (§18.3 item 2): unrounded comparison
            if (actual <= target) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: 100,
                    score_percentage: 100,
                    status: 'CONFIRMED',
                    evaluable: true,
                    is_cliff: true,
                    notes: ['At or below target: full score (CONFIRMED)'],
                };
            }
            // Even by 0.01 above target scores zero
            return {
                type,
                target,
                actual,
                attainment_percent: 0,
                score_percentage: 0,
                status: 'CONFIRMED',
                evaluable: true,
                is_cliff: true,
                notes: ['Above target scores 0 even by 0.01 cliff threshold (CONFIRMED)'],
            };
        }

        case 'TYPE_4_ALL_OR_NOTHING': {
            if (actual >= target) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: 100,
                    score_percentage: 100,
                    status: 'CONFIRMED',
                    evaluable: true,
                    is_cliff: true,
                    notes: ['At or above target: full score 100% (CONFIRMED)'],
                };
            }
            return {
                type,
                target,
                actual,
                attainment_percent: 0,
                score_percentage: 0,
                status: 'CONFIRMED',
                evaluable: true,
                is_cliff: true,
                notes: ['Below target: all-or-nothing zero score (CONFIRMED)'],
            };
        }

        case 'TYPE_5_NEGATIVE_SCORING': {
            // Section 18.2 Note: Do not implement invented penalty formula until observed
            return {
                type,
                target,
                actual,
                attainment_percent: null,
                score_percentage: null,
                status: 'PENDING_SOURCE',
                evaluable: false,
                is_cliff: false,
                notes: ['Type 5 Negative Scoring calculation pending source definition (§18.2)'],
            };
        }

        case 'TYPE_6_THRESHOLD': {
            // Threshold is required (§18.3 item 5)
            if (threshold === null || threshold === undefined) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: null,
                    score_percentage: null,
                    status: 'PENDING_SOURCE',
                    evaluable: false,
                    is_cliff: true,
                    notes: ['Type 6 requires threshold parameter — marked PENDING_SOURCE'],
                };
            }

            // Normalise threshold: either percentage (e.g. 40 or 0.4) or absolute value
            const threshAbs = threshold <= 1.0 && threshold > 0 ? threshold * target : (threshold > 1 && threshold <= 100 ? (threshold / 100) * target : threshold);

            if (actual < threshAbs) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: 0,
                    score_percentage: 0,
                    status: 'CONFIRMED',
                    evaluable: true,
                    is_cliff: true,
                    notes: [`Below threshold (${threshold}) scores zero (CONFIRMED)`],
                };
            }

            // Proportional above threshold
            const s = Math.min((actual / target) * 100, maxCap);
            return {
                type,
                target,
                actual,
                attainment_percent: (actual / target) * 100,
                score_percentage: s,
                status: 'CONFIRMED',
                evaluable: true,
                is_cliff: true,
                notes: ['At or above threshold: proportional score (CONFIRMED worked example)'],
            };
        }

        case 'TYPE_7_LOWER_THRESHOLD': {
            // Requires target and maximum threshold
            if (threshold === null || threshold === undefined || threshold <= target) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: null,
                    score_percentage: null,
                    status: 'NOT_EVALUABLE',
                    evaluable: false,
                    is_cliff: true,
                    notes: ['Type 7 requires maximum threshold strictly greater than target'],
                };
            }

            if (actual <= target) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: 100,
                    score_percentage: 100,
                    status: 'CONFIRMED',
                    evaluable: true,
                    is_cliff: true,
                    notes: ['At or below target achieves 100% full score (CONFIRMED)'],
                };
            }

            if (actual >= threshold) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: 0,
                    score_percentage: 0,
                    status: 'CONFIRMED',
                    evaluable: true,
                    is_cliff: true,
                    notes: ['At or above maximum threshold scores zero (CONFIRMED)'],
                };
            }

            // Linear decline between target and threshold (§18.2 & Appendix G.1)
            const s = ((threshold - actual) / (threshold - target)) * 100;
            return {
                type,
                target,
                actual,
                attainment_percent: s,
                score_percentage: s,
                status: 'PENDING_CONFIRMATION',
                evaluable: true,
                is_cliff: true,
                notes: ['Linear decline between target and threshold (working reading)'],
            };
        }

        case 'TYPE_8_RATING_SCALE': {
            if (!rating_scale) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: null,
                    score_percentage: null,
                    status: 'PENDING_SOURCE',
                    evaluable: false,
                    is_cliff: false,
                    notes: ['Rating scale parameters not provided in source — PENDING_SOURCE'],
                };
            }

            const { min, max } = rating_scale;
            if (max <= min) {
                return {
                    type,
                    target,
                    actual,
                    attainment_percent: null,
                    score_percentage: null,
                    status: 'NOT_EVALUABLE',
                    evaluable: false,
                    is_cliff: false,
                    notes: ['Invalid rating scale range (max <= min)'],
                };
            }

            const pct = Math.max(0, Math.min(100, ((actual - min) / (max - min)) * 100));
            return {
                type,
                target,
                actual,
                attainment_percent: pct,
                score_percentage: pct,
                status: 'PENDING_CONFIRMATION',
                evaluable: true,
                is_cliff: false,
                notes: ['Mapped from administrator rating scale'],
            };
        }

        default:
            return {
                type,
                target,
                actual,
                attainment_percent: null,
                score_percentage: null,
                status: 'NOT_EVALUABLE',
                evaluable: false,
                is_cliff: false,
                notes: [`Unknown KPI type "${type}" — cannot score`],
            };
    }
}
