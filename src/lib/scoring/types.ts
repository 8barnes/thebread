/**
 * MERIDIAN ENTERPRISE PLATFORM
 * §17, §18, §20, §21, §33 — Scoring Engine & D1/D2 Types
 */

import type { KpiType } from '../parse/types.js';

export type KpiScoringStatus =
    | 'CONFIRMED'
    | 'PENDING_CONFIRMATION'
    | 'PENDING_SOURCE'
    | 'NOT_EVALUABLE';

export type MeridianScoreBand =
    | 'UNSATISFACTORY'  // 1.0 - 1.4
    | 'BELOW'           // 1.5 - 2.4
    | 'MEETS'           // 2.5 - 3.4
    | 'STRONG'          // 3.5 - 4.4
    | 'EXCEPTIONAL';    // 4.5 - 5.0

export interface KpiScoringInput {
    type: KpiType;
    target: number | null;
    actual: number | null;
    threshold?: number | null;
    capPolicy?: 'SOURCE_CAPPED_100' | 'MERIDIAN_120';
    rating_scale?: { min: number; max: number } | null;
}

export interface KpiScoringResult {
    type: KpiType;
    target: number | null;
    actual: number | null;
    attainment_percent: number | null;
    score_percentage: number | null;
    status: KpiScoringStatus;
    evaluable: boolean;
    is_cliff: boolean;
    notes: string[];
}

export interface EvaluatedKpiScore {
    code: string;
    title: string;
    perspective: string;
    kpi_type: KpiType;
    target: number | null;
    actual: number | null;
    weight: number | null;
    attainment_percent: number | null;
    kpi_score_5pt: number | null;
    weighted_score_5pt: number | null;
    status: KpiScoringStatus;
    evaluable: boolean;
}

export interface PerspectiveScore {
    name: string;
    weight: number | null;
    effective_weight: number;
    attainment_percent: number | null;
    score_5pt: number | null;
    weighted_score_5pt: number | null;
    kpi_count: number;
    evaluable_kpi_count: number;
}

export interface D1ResultsEvaluation {
    kpi_scores: EvaluatedKpiScore[];
    perspective_scores: PerspectiveScore[];
    overall_attainment_percent: number | null;
    overall_d1_score_5pt: number | null;
    category: MeridianScoreBand;
    not_evaluable_count: number;
    renormalized_weights: boolean;
    confidence_penalty: number;
}

export interface EvaluatedCompetency {
    name: string;
    self_rating: number | null;
    reviewer_rating: number | null;
    gap: number | null;
}

export interface D2BehaviorEvaluation {
    competencies: EvaluatedCompetency[];
    average_reviewer_rating_5pt: number | null;
    average_self_rating_5pt: number | null;
    overall_d2_score_5pt: number | null;
    competency_count: number;
    status: 'COMPLETE' | 'SOFT_ABSENT' | 'INSUFFICIENT';
    category: MeridianScoreBand;
}

export interface DualScoreReconciliation {
    self_score: number | null;
    supervisor_score: number | null;
    source_score: number | null;
    meridian_evidence_score: number | null;
    source_vs_meridian_delta: number | null;
    within_tolerance: boolean; // ±1.0 tolerance
    material_difference_flag: boolean;
    policy_differences: string[];
}
