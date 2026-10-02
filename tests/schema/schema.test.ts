import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    validateNormalizedAppraisal,
    validateKpiRecord,
    serializeNormalizedAppraisal,
    deserializeNormalizedAppraisal,
} from '../../src/lib/schema/normalizedAppraisal.js';
import { buildKpiRecord, buildPerspectiveRecord } from '../../src/lib/schema/builder.js';
import { ConfidenceRules } from '../../src/lib/schema/confidence.js';
import { NormalizedAppraisal, KpiRecord } from '../../src/lib/parse/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('PHASE 2 — EXTENDED PARSE SCHEMA Acceptance Criteria', () => {
    const candidatePaths = [
        resolve(__dirname, '../../src/lib/fixtures/julius_danquah_example.json'),
        resolve(__dirname, '../../../../src/lib/fixtures/julius_danquah_example.json'),
        resolve(process.cwd(), 'src/lib/fixtures/julius_danquah_example.json'),
        resolve(process.cwd(), 'worker/src/lib/fixtures/julius_danquah_example.json'),
    ];
    const fixturePath = candidatePaths.find(p => existsSync(p)) || candidatePaths[0]!;
    const fixtureJson = readFileSync(fixturePath, 'utf-8');
    const canonicalRecord: NormalizedAppraisal = JSON.parse(fixtureJson);

    it('Criterion 1: Every field defined with type and nullability validates cleanly', () => {
        const result = validateNormalizedAppraisal(canonicalRecord);
        assert.equal(result.valid, true, `Validation errors: ${JSON.stringify(result.errors)}`);
        assert.equal(result.errors.length, 0);

        // Verify nullability checks
        assert.equal(canonicalRecord.employee.job_title, null);
        assert.equal(canonicalRecord.counter_signer, null);
        assert.equal(canonicalRecord.kpis[0]?.unit, null);
    });

    it('Criterion 2: Every field carries source and confidence where applicable', () => {
        // Perspectives
        for (const p of canonicalRecord.perspectives) {
            assert.ok(p.source, 'Perspective must have source');
            assert.ok(typeof p.source.document === 'string');
            assert.ok(typeof p.source.page === 'number');
            assert.ok(typeof p.confidence === 'number' && p.confidence >= 0 && p.confidence <= 1);
        }

        // KPIs
        for (const k of canonicalRecord.kpis) {
            assert.ok(k.source, 'KPI must have source');
            assert.ok(typeof k.source.document === 'string');
            assert.ok(typeof k.source.page === 'number');
            assert.ok(typeof k.confidence === 'number' && k.confidence >= 0 && k.confidence <= 1);
        }

        // Missing source should fail validation
        const badKpi = { ...canonicalRecord.kpis[0], source: undefined };
        const errors: any[] = [];
        validateKpiRecord(badKpi, 0, errors);
        assert.ok(errors.length > 0, 'KPI without source must fail validation');
    });

    it('Criterion 3: Warnings have codes, severities, and context', () => {
        assert.ok(canonicalRecord.warnings.length > 0);
        for (const w of canonicalRecord.warnings) {
            assert.ok(['INFO', 'WARN', 'ERROR'].includes(w.severity));
            assert.ok(typeof w.code === 'string' && w.code.length > 0);
            assert.ok(typeof w.message === 'string' && w.message.length > 0);
            assert.ok(w.context !== null && typeof w.context === 'object');
        }
    });

    it('Criterion 4: Perspective weights captured even when null', () => {
        const nullWeightPerspective = canonicalRecord.perspectives.find(p => p.name === 'HR & Corp. Comms.');
        assert.ok(nullWeightPerspective, 'Perspective with null weight should exist');
        assert.equal(nullWeightPerspective?.weight, null);

        const weightedPerspective = canonicalRecord.perspectives.find(p => p.name === 'Financial');
        assert.equal(weightedPerspective?.weight, 20);

        // Builder preserves null weight
        const built = buildPerspectiveRecord({
            name: 'Operations',
            weight: null,
            source: { document: 'test.pdf', page: 1, row: null, field: null },
        });
        assert.equal(built.weight, null);
        assert.equal(built.confidence, 0.0);
    });

    it('Criterion 5: Self/supervisor delta precomputed (employee_actual − reviewer_actual)', () => {
        const kpi = canonicalRecord.kpis[0];
        assert.ok(kpi);
        assert.equal(kpi.reviewer_actual, 50);
        assert.equal(kpi.employee_actual, 100);
        assert.equal(kpi.self_vs_supervisor_delta, 50);

        // Verify built KPI calculates delta accurately
        const builtKpi = buildKpiRecord({
            code: 'KPI-TEST',
            title: 'Test KPI',
            objective_text: 'Test objective text',
            kpi_type_from_pdf: 'Type 1',
            kpi_type_inferred: 'TYPE_1_HIGHER_BETTER',
            target: 100,
            actual: 80,
            weight: 20,
            bsc_perspective: 'financial',
            employee_actual: 90,
            reviewer_actual: 70,
            source: { document: 'test.pdf', page: 1, row: 1, field: null },
        });
        assert.equal(builtKpi.self_vs_supervisor_delta, 20);

        // If either score is null, delta must be null
        const nullScoreKpi = buildKpiRecord({
            code: 'KPI-TEST-2',
            title: 'Test KPI 2',
            objective_text: 'Test objective',
            kpi_type_from_pdf: 'Type 1',
            kpi_type_inferred: 'TYPE_1_HIGHER_BETTER',
            target: 100,
            actual: 80,
            weight: 20,
            bsc_perspective: 'financial',
            employee_actual: null,
            reviewer_actual: 70,
            source: { document: 'test.pdf', page: 1, row: 1, field: null },
        });
        assert.equal(nullScoreKpi.self_vs_supervisor_delta, null);
    });

    it('Criterion 6: KPI type recorded in three forms (from PDF, inferred, resolved) + divergence', () => {
        const kpi = canonicalRecord.kpis[0];
        assert.ok(kpi);
        assert.equal(kpi.kpi_type_from_pdf, 'Type 1');
        assert.equal(kpi.kpi_type_inferred, 'TYPE_2_LESS_MEANS_MORE');
        assert.equal(kpi.kpi_type, 'TYPE_2_LESS_MEANS_MORE');
        assert.equal(kpi.kpi_type_divergence, true);

        // Builder detects non-divergence when types match
        const matchingKpi = buildKpiRecord({
            code: 'KPI-MATCH',
            title: 'Grow sales revenue',
            objective_text: 'Grow sales revenue',
            kpi_type_from_pdf: 'TYPE_1_HIGHER_BETTER',
            kpi_type_inferred: 'TYPE_1_HIGHER_BETTER',
            target: 100,
            actual: 100,
            weight: 10,
            bsc_perspective: 'financial',
            source: { document: 'test.pdf', page: 1, row: 1, field: null },
        });
        assert.equal(matchingKpi.kpi_type, 'TYPE_1_HIGHER_BETTER');
        assert.equal(matchingKpi.kpi_type_divergence, false);
    });

    it('Criterion 7: Schema is serializable to JSON', () => {
        const serialized = serializeNormalizedAppraisal(canonicalRecord);
        assert.ok(typeof serialized === 'string');
        const parsed = JSON.parse(serialized);
        assert.equal(parsed.document.source_filename, canonicalRecord.document.source_filename);

        const deserialized = deserializeNormalizedAppraisal(serialized);
        assert.equal(deserialized.employee.name, canonicalRecord.employee.name);
    });

    it('Criterion 8: Schema is stable across runs (same input → same output)', () => {
        const serialized1 = serializeNormalizedAppraisal(canonicalRecord);
        const serialized2 = serializeNormalizedAppraisal(canonicalRecord);
        assert.equal(serialized1, serialized2, 'Serialization must be 100% deterministic');

        // Check key order stability even if properties were ordered differently
        const copy1: any = { ...canonicalRecord, extra: undefined };
        const copy2: any = JSON.parse(JSON.stringify(canonicalRecord));
        assert.equal(serializeNormalizedAppraisal(copy1), serializeNormalizedAppraisal(copy2));
    });

    it('Confidence scoring rules match Phase 2 §2.7 specification', () => {
        assert.equal(ConfidenceRules.employeeName(true), 1.0);
        assert.equal(ConfidenceRules.employeeName(false), 0.7);

        assert.equal(ConfidenceRules.employeeId('EXACT'), 1.0);
        assert.equal(ConfidenceRules.employeeId('MULTIPLE'), 0.5);
        assert.equal(ConfidenceRules.employeeId('NONE'), 0.0);

        assert.equal(ConfidenceRules.cyclePeriod(true), 1.0);
        assert.equal(ConfidenceRules.cyclePeriod(false), 0.5);

        assert.equal(ConfidenceRules.perspectiveWeight(true), 1.0);
        assert.equal(ConfidenceRules.perspectiveWeight(false), 0.0);

        assert.equal(ConfidenceRules.kpiTargetOrActual(true), 1.0);
        assert.equal(ConfidenceRules.kpiTargetOrActual(false), 0.8);

        assert.equal(ConfidenceRules.kpiComment(true), 1.0);
        assert.equal(ConfidenceRules.kpiComment(false), 0.5);

        assert.equal(ConfidenceRules.signatureSignedAt(true), 1.0);
        assert.equal(ConfidenceRules.signatureSignedAt(false), 0.7);
    });
});
