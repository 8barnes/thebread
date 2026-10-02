import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { attainmentTo5PtScore, scoreToMeridianBand, evaluateD1 } from '../../src/lib/scoring/d1.js';
import { evaluateD2 } from '../../src/lib/scoring/d2.js';
import { reconcileScores } from '../../src/lib/scoring/dualScore.js';
import { NormalizedAppraisal } from '../../src/lib/parse/types.js';

describe('§20, §21, §33 — D1 Results, D2 Behaviour & Dual-Score Reconciliation Suite', () => {
    const sampleRecord: NormalizedAppraisal = {
        document: {
            source_filename: 'sample.pdf',
            source_hash: 'abc',
            generator: 'SeamlessHR',
            parsed_at: '2026-10-01T00:00:00Z',
            parser_version: '1.0.0',
        },
        employee: {
            employee_id: 'EMP-01',
            name: 'Test Employee',
            department: 'Finance',
            job_title: 'Analyst',
            hr_master_match: 'EXACT',
        },
        cycle: {
            label: 'Q1 2026',
            period_start: '2026-01-01',
            period_end: '2026-05-31',
            is_test_phase: false,
        },
        reviewer: { name: 'Manager A', department: 'Finance', signed_at: null },
        counter_signer: null,
        arc: null,
        perspectives: [
            {
                name: 'Financial',
                weight: 60,
                is_standard_bsc: true,
                confidence: 1.0,
                source: { document: 'sample.pdf', page: 1, row: null, field: null },
            },
            {
                name: 'Customer',
                weight: 40,
                is_standard_bsc: true,
                confidence: 1.0,
                source: { document: 'sample.pdf', page: 2, row: null, field: null },
            },
        ],
        kpis: [
            {
                code: 'KPI-01',
                title: 'Revenue target',
                objective_text: 'Deliver revenue',
                kpi_type_from_pdf: 'Type 1',
                kpi_type_inferred: 'TYPE_1_HIGHER_BETTER',
                kpi_type: 'TYPE_1_HIGHER_BETTER',
                kpi_type_divergence: false,
                target: 100,
                actual: 90,
                actual_score_from_pdf: 90,
                weight: 100,
                weighted_score_from_pdf: 60,
                final_score_from_pdf: 54, // 90% of 60%
                completion_percent: 90,
                unit: 'GHS',
                bsc_perspective: 'Financial',
                perspective_weight: 60,
                reviewer_target: 100,
                reviewer_actual: 90,
                employee_target: 100,
                employee_actual: 100,
                self_vs_supervisor_delta: 10,
                comment: 'Good effort',
                comment_word_count: 2,
                comment_author: null,
                comment_author_department: null,
                comment_timestamp: null,
                source: { document: 'sample.pdf', page: 1, row: 1, field: null },
                confidence: 1.0,
            },
            {
                code: 'KPI-02',
                title: 'Resolution turnaround',
                objective_text: 'Reduce ticket response time',
                kpi_type_from_pdf: 'Type 2',
                kpi_type_inferred: 'TYPE_2_LESS_MEANS_MORE',
                kpi_type: 'TYPE_2_LESS_MEANS_MORE',
                kpi_type_divergence: false,
                target: 24,
                actual: 20,
                actual_score_from_pdf: 100,
                weight: 100,
                weighted_score_from_pdf: 40,
                final_score_from_pdf: 40,
                completion_percent: 100,
                unit: 'hours',
                bsc_perspective: 'Customer',
                perspective_weight: 40,
                reviewer_target: 24,
                reviewer_actual: 20,
                employee_target: 24,
                employee_actual: 20,
                self_vs_supervisor_delta: 0,
                comment: 'Excellent customer satisfaction',
                comment_word_count: 3,
                comment_author: null,
                comment_author_department: null,
                comment_timestamp: null,
                source: { document: 'sample.pdf', page: 2, row: 1, field: null },
                confidence: 1.0,
            },
        ],
        competencies: [],
        warnings: [],
    };

    // ─── 1. Scale & Mapping ─────────────────────────────────────────────
    describe('Attainment-to-5pt Score Scale (§20.2)', () => {
        it('anchors to Meridian categories correctly', () => {
            assert.equal(attainmentTo5PtScore(0), 1.0);
            assert.equal(attainmentTo5PtScore(60), 2.0);
            assert.equal(attainmentTo5PtScore(80), 3.0);
            assert.equal(attainmentTo5PtScore(100), 4.0);
            assert.equal(attainmentTo5PtScore(120), 5.0);
        });

        it('categorizes scores to Meridian bands accurately', () => {
            assert.equal(scoreToMeridianBand(1.2), 'UNSATISFACTORY');
            assert.equal(scoreToMeridianBand(2.0), 'BELOW');
            assert.equal(scoreToMeridianBand(3.1), 'MEETS');
            assert.equal(scoreToMeridianBand(4.2), 'STRONG');
            assert.equal(scoreToMeridianBand(4.8), 'EXCEPTIONAL');
        });
    });

    // ─── 2. D1 Results Evaluation ───────────────────────────────────────
    describe('D1 Results Hierarchical Roll-Up (§20.3 & §33)', () => {
        it('computes accurate D1 KPI, perspective, and overall results', () => {
            const d1 = evaluateD1(sampleRecord);

            // KPI-01: 90% attainment
            assert.equal(d1.kpi_scores[0]?.attainment_percent, 90);
            assert.equal(d1.kpi_scores[0]?.kpi_score_5pt, 3.5); // 90% -> 3.5

            // KPI-02: 100% attainment
            assert.equal(d1.kpi_scores[1]?.attainment_percent, 100);
            assert.equal(d1.kpi_scores[1]?.kpi_score_5pt, 4.0); // 100% -> 4.0

            // Overall attainment: 60% of 90 + 40% of 100 = 54 + 40 = 94%
            assert.equal(d1.overall_attainment_percent, 94);
            assert.equal(d1.category, 'STRONG');
            assert.equal(d1.not_evaluable_count, 0);
        });

        it('renormalizes weights when a KPI is NOT_EVALUABLE', () => {
            const recordWithUnevaluable: NormalizedAppraisal = {
                ...sampleRecord,
                kpis: [
                    ...sampleRecord.kpis,
                    {
                        ...sampleRecord.kpis[0]!,
                        code: 'KPI-03',
                        kpi_type: 'TYPE_5_NEGATIVE_SCORING', // pending source, not evaluable
                        weight: 20,
                    },
                ],
            };

            const d1 = evaluateD1(recordWithUnevaluable);
            assert.equal(d1.not_evaluable_count, 1);
            assert.equal(d1.confidence_penalty, 0.05);
        });
    });

    // ─── 3. D2 Behaviour Evaluation ─────────────────────────────────────
    describe('D2 Behaviour & Competencies Model (§33)', () => {
        it('evaluates competencies, averages, and perception gaps', () => {
            const record: NormalizedAppraisal = {
                ...sampleRecord,
                competencies: [
                    { name: 'Integrity', self_rating: 5, reviewer_rating: 4, reviewer_comment: null, source: { document: 'a', page: 1, row: null, field: null }, confidence: 1.0 },
                    { name: 'Collaboration', self_rating: 4, reviewer_rating: 4, reviewer_comment: null, source: { document: 'a', page: 1, row: null, field: null }, confidence: 1.0 },
                    { name: 'Problem Solving', self_rating: 5, reviewer_rating: 3, reviewer_comment: null, source: { document: 'a', page: 1, row: null, field: null }, confidence: 1.0 },
                    { name: 'Customer Orientation', self_rating: 4, reviewer_rating: 4, reviewer_comment: null, source: { document: 'a', page: 1, row: null, field: null }, confidence: 1.0 },
                ],
            };

            const d2 = evaluateD2(record);
            assert.equal(d2.competency_count, 4);
            assert.equal(d2.status, 'COMPLETE');
            // Reviewer avg: (4 + 4 + 3 + 4) / 4 = 15 / 4 = 3.75
            assert.equal(d2.average_reviewer_rating_5pt, 3.75);
            // Self avg: (5 + 4 + 5 + 4) / 4 = 18 / 4 = 4.5
            assert.equal(d2.average_self_rating_5pt, 4.5);
            assert.equal(d2.category, 'STRONG');
            // Perception gap for Problem Solving: 5 - 3 = 2
            assert.equal(d2.competencies[2]?.gap, 2);
        });

        it('handles absent competencies gracefully with SOFT_ABSENT', () => {
            const d2 = evaluateD2({ ...sampleRecord, competencies: [] });
            assert.equal(d2.status, 'SOFT_ABSENT');
            assert.equal(d2.overall_d2_score_5pt, null);
        });
    });

    // ─── 4. Dual-Score Reconciliation ───────────────────────────────────
    describe('Dual-Score Reconciliation Architecture (§9 & §21)', () => {
        it('preserves distinct score concepts and checks ±1.0 tolerance', () => {
            const d1 = evaluateD1(sampleRecord);
            const recon = reconcileScores(sampleRecord, d1);

            // Self score average: 100 and 20 -> 60
            assert.equal(recon.self_score, 60);
            // Supervisor score average: 90 and 20 -> 55
            assert.equal(recon.supervisor_score, 55);
            // Source score sum: 54 + 40 = 94
            assert.equal(recon.source_score, 94);
            // Meridian evidence score: 94
            assert.equal(recon.meridian_evidence_score, 94);
            // Delta: 0 <= 1.0 tolerance
            assert.equal(recon.within_tolerance, true);
            assert.equal(recon.material_difference_flag, false);
        });

        it('flags material difference when delta exceeds ±1.0', () => {
            const recordWithDiscrepancy: NormalizedAppraisal = {
                ...sampleRecord,
                kpis: [
                    {
                        ...sampleRecord.kpis[0]!,
                        final_score_from_pdf: 40, // discrepancy from calculated 54
                    },
                    sampleRecord.kpis[1]!,
                ],
            };

            const d1 = evaluateD1(recordWithDiscrepancy);
            const recon = reconcileScores(recordWithDiscrepancy, d1);

            assert.equal(recon.within_tolerance, false);
            assert.equal(recon.material_difference_flag, true);
            assert.ok(recon.policy_differences.length > 0);
        });
    });
});
