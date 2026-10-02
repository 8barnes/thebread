/**
 * PHASE 3 — REVISED AND EXTENDED ARIG RULES
 * Types for the Appraisal Review & Integrity Guard (ARIG) rule engine.
 */

export type RuleType = 'HARD' | 'SOFT';

export interface RuleResult {
    rule_number: number;
    rule_code: string;
    rule_name: string;
    rule_type: RuleType;
    passed: boolean;
    evidence: Record<string, unknown>;
    failure_message?: string;
    is_hard_lock_trigger: boolean;
}

export interface GateData {
    data_source: string | null;
    passed: boolean | null;
}

export interface ArigConfig {
    org_id: string;
    enabled_kpi_types: string[];
    gate_data?: {
        conduct?: GateData;
        revenue?: GateData;
        safety?: GateData;
    };
}

export interface ArigEvaluationResult {
    quality_score: number;             // (Passed / Total Rules) * 100
    total_rules: number;               // 30
    passed_rules_count: number;
    failed_rules_count: number;
    hard_failures_count: number;
    soft_failures_count: number;
    hard_locked: boolean;              // Any HARD failed OR quality_score < 75
    responses: RuleResult[];
    evaluated_at: string;
}
