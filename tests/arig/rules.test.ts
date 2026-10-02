import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateARIG } from '../../src/lib/arig/evaluate.js';
import { arigRules } from '../../src/lib/arig/rules.js';
import { ArigConfig } from '../../src/lib/arig/types.js';
import { NormalizedAppraisal } from '../../src/lib/parse/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PHASE 3 — REVISED & EXTENDED ARIG RULES (Rules 1-30)', () => {
    const candidatePaths = [
        resolve(__dirname, '../../src/lib/fixtures/julius_danquah_example.json'),
        resolve(__dirname, '../../../../src/lib/fixtures/julius_danquah_example.json'),
        resolve(process.cwd(), 'src/lib/fixtures/julius_danquah_example.json'),
        resolve(process.cwd(), 'worker/src/lib/fixtures/julius_danquah_example.json'),
    ];
    const fixturePath = candidatePaths.find(p => existsSync(p)) || candidatePaths[0]!;
    const fixtureJson = readFileSync(fixturePath, 'utf-8');
    const sampleRecord: NormalizedAppraisal = JSON.parse(fixtureJson);

    const defaultConfig: ArigConfig = {
        org_id: 'rcpl',
        enabled_kpi_types: ['TYPE_1_HIGHER_BETTER', 'TYPE_2_LESS_MEANS_MORE'],
        gate_data: {
            conduct: { data_source: 'registry://conduct', passed: true },
            revenue: { data_source: 'finance://erp', passed: true },
            safety: { data_source: 'ehs://safety', passed: true },
        },
    };

    it('Rule 1: META_EMP_ID passes on EXACT match', () => {
        const r1 = arigRules[1]!(sampleRecord, defaultConfig);
        assert.equal(r1.passed, true);
        assert.equal(r1.rule_type, 'HARD');

        const noMatchRecord = {
            ...sampleRecord,
            employee: { ...sampleRecord.employee, employee_id: null, hr_master_match: 'NONE' as const },
        };
        const r1Fail = arigRules[1]!(noMatchRecord, defaultConfig);
        assert.equal(r1Fail.passed, false);
        assert.equal(r1Fail.is_hard_lock_trigger, true);
    });

    it('Rule 24: SIGNATORY_SEGREGATION triggers HARD failure when Reviewer = ARC', () => {
        // In the Julius Danquah sample, Sally Osei-Boateng is both reviewer and arc
        const r24 = arigRules[24]!(sampleRecord, defaultConfig);
        assert.equal(r24.passed, false);
        assert.equal(r24.rule_type, 'HARD');
        assert.equal(r24.is_hard_lock_trigger, true);

        // Segregated roles should pass
        const segregatedRecord: NormalizedAppraisal = {
            ...sampleRecord,
            arc: { name: 'Dr. Kwaku Mensah', department: 'ARC Audit', signed_at: '2026-06-16T09:00:00Z' },
        };
        const r24Pass = arigRules[24]!(segregatedRecord, defaultConfig);
        assert.equal(r24Pass.passed, true);
        assert.equal(r24Pass.is_hard_lock_trigger, false);
    });

    it('Rule 23: PERSPECTIVE_WEIGHT_SUM checks weight sum', () => {
        const r23 = arigRules[23]!(sampleRecord, defaultConfig);
        // Perspectives with weights are 20 and 25 (sum = 45 != 100)
        assert.equal(r23.passed, false);
        assert.equal(r23.rule_type, 'HARD');

        // Balanced 100% perspectives should pass
        const balancedRecord: NormalizedAppraisal = {
            ...sampleRecord,
            perspectives: [
                { ...sampleRecord.perspectives[0]!, weight: 50 },
                { ...sampleRecord.perspectives[1]!, weight: 50 },
            ],
        };
        const r23Pass = arigRules[23]!(balancedRecord, defaultConfig);
        assert.equal(r23Pass.passed, true);
    });

    it('Rule 30: COMMENT_STRUCTURE_SUBSTANTIVE requires ≥20 words for outlier ratings', () => {
        const r30 = arigRules[30]!(sampleRecord, defaultConfig);
        // Comment has 38 words, so passes
        assert.equal(r30.passed, true);

        const shortCommentRecord: NormalizedAppraisal = {
            ...sampleRecord,
            kpis: [
                {
                    ...sampleRecord.kpis[0]!,
                    reviewer_actual: 1.0, // outlier (|1.0 - 3.0| >= 1.5)
                    comment: 'Too short',
                    comment_word_count: 2,
                },
            ],
        };
        const r30Fail = arigRules[30]!(shortCommentRecord, defaultConfig);
        assert.equal(r30Fail.passed, false);
        assert.equal(r30Fail.is_hard_lock_trigger, true);
    });

    it('evaluateARIG calculates 30-rule denominator Quality Score & Hard Lock state', () => {
        const evalResult = evaluateARIG(sampleRecord, defaultConfig);

        assert.equal(evalResult.total_rules, 30);
        assert.equal(evalResult.responses.length, 30);
        assert.ok(evalResult.quality_score >= 0 && evalResult.quality_score <= 100);

        // Because sampleRecord has reviewer == arc, it should trigger Hard Lock
        assert.equal(evalResult.hard_locked, true);
        assert.ok(evalResult.hard_failures_count > 0);
    });
});
