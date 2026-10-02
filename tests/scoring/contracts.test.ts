import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { scoreKpi } from '../../src/lib/scoring/contracts.js';

describe('§18 — KPI Type Scoring Contracts Acceptance Suite', () => {
    // ─── Type 1: The Higher The Better ──────────────────────────────────
    describe('Type 1 — The Higher The Better', () => {
        it('scores full score (100) when actual >= target (CONFIRMED)', () => {
            const r = scoreKpi({ type: 'TYPE_1_HIGHER_BETTER', target: 90, actual: 100 });
            assert.equal(r.status, 'CONFIRMED');
            assert.equal(r.score_percentage, 100);
            assert.equal(r.evaluable, true);
        });

        it('scores 80 when target 90 and actual 72 (working reading: actual ÷ target)', () => {
            const r = scoreKpi({ type: 'TYPE_1_HIGHER_BETTER', target: 90, actual: 72 });
            assert.equal(r.score_percentage, 80);
            assert.equal(r.status, 'PENDING_CONFIRMATION');
        });

        it('supports MERIDIAN_120 cap policy for overachievement', () => {
            const r = scoreKpi({
                type: 'TYPE_1_HIGHER_BETTER',
                target: 100,
                actual: 130,
                capPolicy: 'MERIDIAN_120',
            });
            assert.equal(r.score_percentage, 120);
            assert.equal(r.attainment_percent, 130);
        });

        it('handles zero target and zero actual as 100% (§18.3 item 1)', () => {
            const r = scoreKpi({ type: 'TYPE_1_HIGHER_BETTER', target: 0, actual: 0 });
            assert.equal(r.score_percentage, 100);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('treats zero target with positive actual as NOT_EVALUABLE', () => {
            const r = scoreKpi({ type: 'TYPE_1_HIGHER_BETTER', target: 0, actual: 50 });
            assert.equal(r.evaluable, false);
            assert.equal(r.status, 'NOT_EVALUABLE');
        });
    });

    // ─── Type 2: Less Means More ────────────────────────────────────────
    describe('Type 2 — Less Means More (The Lower The Better I)', () => {
        it('scores full score (100) when actual <= target (CONFIRMED)', () => {
            const r = scoreKpi({ type: 'TYPE_2_LESS_MEANS_MORE', target: 24, actual: 20 });
            assert.equal(r.score_percentage, 100);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('grades smoothly above target without cliff drop', () => {
            const r = scoreKpi({ type: 'TYPE_2_LESS_MEANS_MORE', target: 20, actual: 25 });
            assert.equal(r.score_percentage, 80);
            assert.equal(r.status, 'PENDING_CONFIRMATION');
        });
    });

    // ─── Type 3: Less Or Nothing ────────────────────────────────────────
    describe('Type 3 — Less Or Nothing (The Lower The Better II)', () => {
        it('scores full score (100) when actual <= target', () => {
            const r = scoreKpi({ type: 'TYPE_3_LESS_OR_NOTHING', target: 50, actual: 50 });
            assert.equal(r.score_percentage, 100);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('scores 0 even by 0.01 above target (CONFIRMED cliff precision)', () => {
            const r = scoreKpi({ type: 'TYPE_3_LESS_OR_NOTHING', target: 50, actual: 50.01 });
            assert.equal(r.score_percentage, 0);
            assert.equal(r.status, 'CONFIRMED');
            assert.equal(r.is_cliff, true);
        });
    });

    // ─── Type 4: All Or Nothing ─────────────────────────────────────────
    describe('Type 4 — All Or Nothing', () => {
        it('scores 100 when actual >= target (equality included, CONFIRMED)', () => {
            const r = scoreKpi({ type: 'TYPE_4_ALL_OR_NOTHING', target: 1, actual: 1 });
            assert.equal(r.score_percentage, 100);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('scores 0 when actual is 89.99 with target 90 (CONFIRMED)', () => {
            const r = scoreKpi({ type: 'TYPE_4_ALL_OR_NOTHING', target: 90, actual: 89.99 });
            assert.equal(r.score_percentage, 0);
            assert.equal(r.status, 'CONFIRMED');
        });
    });

    // ─── Type 5: Negative Scoring ───────────────────────────────────────
    describe('Type 5 — Negative Scoring', () => {
        it('returns PENDING_SOURCE and non-evaluable without invented formula (§18.2)', () => {
            const r = scoreKpi({ type: 'TYPE_5_NEGATIVE_SCORING', target: 100000, actual: 80000 });
            assert.equal(r.evaluable, false);
            assert.equal(r.status, 'PENDING_SOURCE');
            assert.equal(r.score_percentage, null);
        });
    });

    // ─── Type 6: Threshold ──────────────────────────────────────────────
    describe('Type 6 — Threshold', () => {
        it('scores proportional above threshold (CONFIRMED worked example)', () => {
            const r = scoreKpi({ type: 'TYPE_6_THRESHOLD', target: 100, actual: 50, threshold: 40 });
            assert.equal(r.score_percentage, 50);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('scores 0 below threshold (CONFIRMED: actual 39 with threshold 40%)', () => {
            const r = scoreKpi({ type: 'TYPE_6_THRESHOLD', target: 100, actual: 39, threshold: 40 });
            assert.equal(r.score_percentage, 0);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('scores 100 when target is 0 and actual is 0 (§18.3 item 1, CONFIRMED)', () => {
            const r = scoreKpi({ type: 'TYPE_6_THRESHOLD', target: 0, actual: 0, threshold: 40 });
            assert.equal(r.score_percentage, 100);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('returns PENDING_SOURCE if threshold parameter is missing', () => {
            const r = scoreKpi({ type: 'TYPE_6_THRESHOLD', target: 100, actual: 50 });
            assert.equal(r.evaluable, false);
            assert.equal(r.status, 'PENDING_SOURCE');
        });
    });

    // ─── Type 7: Lower Threshold ────────────────────────────────────────
    describe('Type 7 — Lower Threshold', () => {
        it('scores 100 when actual <= target (CONFIRMED)', () => {
            const r = scoreKpi({ type: 'TYPE_7_LOWER_THRESHOLD', target: 50, actual: 40, threshold: 100 });
            assert.equal(r.score_percentage, 100);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('scores 50 at midpoint actual 75 between target 50 and threshold 100', () => {
            const r = scoreKpi({ type: 'TYPE_7_LOWER_THRESHOLD', target: 50, actual: 75, threshold: 100 });
            assert.equal(r.score_percentage, 50);
            assert.equal(r.status, 'PENDING_CONFIRMATION');
        });

        it('scores 0 at or above threshold 100 (CONFIRMED)', () => {
            const r = scoreKpi({ type: 'TYPE_7_LOWER_THRESHOLD', target: 50, actual: 100, threshold: 100 });
            assert.equal(r.score_percentage, 0);
            assert.equal(r.status, 'CONFIRMED');
        });

        it('fails with NOT_EVALUABLE if threshold <= target', () => {
            const r = scoreKpi({ type: 'TYPE_7_LOWER_THRESHOLD', target: 50, actual: 45, threshold: 40 });
            assert.equal(r.evaluable, false);
            assert.equal(r.status, 'NOT_EVALUABLE');
        });
    });

    // ─── Type 8: Rating Scale ───────────────────────────────────────────
    describe('Type 8 — Rating Scale', () => {
        it('maps linearly when admin scale is supplied', () => {
            const r = scoreKpi({
                type: 'TYPE_8_RATING_SCALE',
                target: 5,
                actual: 3,
                rating_scale: { min: 1, max: 5 },
            });
            assert.equal(r.score_percentage, 50);
            assert.equal(r.status, 'PENDING_CONFIRMATION');
        });

        it('returns PENDING_SOURCE when rating scale is not provided in source', () => {
            const r = scoreKpi({ type: 'TYPE_8_RATING_SCALE', target: 5, actual: 3 });
            assert.equal(r.evaluable, false);
            assert.equal(r.status, 'PENDING_SOURCE');
        });
    });

    // ─── Missing Values ─────────────────────────────────────────────────
    describe('Missing Value Governance (§18.3 item 4)', () => {
        it('marks missing target as NOT_EVALUABLE without silent default', () => {
            const r = scoreKpi({ type: 'TYPE_1_HIGHER_BETTER', target: null, actual: 50 });
            assert.equal(r.evaluable, false);
            assert.equal(r.status, 'NOT_EVALUABLE');
        });

        it('marks missing actual as NOT_EVALUABLE without silent default', () => {
            const r = scoreKpi({ type: 'TYPE_1_HIGHER_BETTER', target: 100, actual: null });
            assert.equal(r.evaluable, false);
            assert.equal(r.status, 'NOT_EVALUABLE');
        });
    });
});
