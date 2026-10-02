/**
 * PHASE 3 — ARIG EVALUATION ENGINE
 * Executes all 30 ARIG rules, calculates Quality Score, and evaluates Hard Lock conditions.
 */

import { NormalizedAppraisal } from '../parse/types.js';
import { ArigConfig, ArigEvaluationResult, RuleResult } from './types.js';
import { arigRules } from './rules.js';

export const TOTAL_ARIG_RULES = 30;
export const HARD_LOCK_QUALITY_SCORE_THRESHOLD = 75;

export function evaluateARIG(record: NormalizedAppraisal, config: ArigConfig): ArigEvaluationResult {
    const responses: RuleResult[] = [];

    for (let ruleNum = 1; ruleNum <= TOTAL_ARIG_RULES; ruleNum++) {
        const evaluator = arigRules[ruleNum];
        if (evaluator) {
            responses.push(evaluator(record, config));
        } else {
            responses.push({
                rule_number: ruleNum,
                rule_code: `RULE_${ruleNum}`,
                rule_name: `Rule ${ruleNum}`,
                rule_type: 'SOFT',
                passed: true,
                evidence: { status: 'DEFAULT_PASS' },
                is_hard_lock_trigger: false,
            });
        }
    }

    const passedCount = responses.filter(r => r.passed).length;
    const failedCount = responses.filter(r => !r.passed).length;
    const hardFailuresCount = responses.filter(r => !r.passed && r.rule_type === 'HARD').length;
    const softFailuresCount = responses.filter(r => !r.passed && r.rule_type === 'SOFT').length;

    // Quality Score = (Passed / Total Rules) * 100 on 30-rule denominator
    const qualityScore = Math.round((passedCount / TOTAL_ARIG_RULES) * 100 * 10) / 10;

    // Hard Lock triggered if ANY HARD rule fails OR Quality Score < 75
    const hardLocked = hardFailuresCount > 0 || qualityScore < HARD_LOCK_QUALITY_SCORE_THRESHOLD;

    return {
        quality_score: qualityScore,
        total_rules: TOTAL_ARIG_RULES,
        passed_rules_count: passedCount,
        failed_rules_count: failedCount,
        hard_failures_count: hardFailuresCount,
        soft_failures_count: softFailuresCount,
        hard_locked: hardLocked,
        responses,
        evaluated_at: new Date().toISOString(),
    };
}
