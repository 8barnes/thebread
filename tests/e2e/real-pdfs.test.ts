import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runPipeline } from '../../src/lib/pipeline/runPipeline.js';

describe('REAL SEAMLESSHR PDFS — END-TO-END PIPELINE EXECUTION', () => {
    const downloadsDir = 'c:/Users/paa.barnes/Downloads';
    const danielPdfPath = path.join(downloadsDir, 'daniel_amoah.pdf');
    const giftyPdfPath = path.join(downloadsDir, 'gifty_kwarko.pdf');

    it('Executes Daniel Amoah (RCPL0088) through end-to-end pipeline', async () => {
        if (!fs.existsSync(danielPdfPath)) {
            console.warn('Skipping Daniel Amoah test: file not found at', danielPdfPath);
            return;
        }

        const buffer = fs.readFileSync(danielPdfPath);
        const result = await runPipeline({
            buffer,
            filename: 'daniel_amoah.pdf',
            orgId: 'rcpl',
            pdfFinalScore: 100,
        });

        assert.equal(result.success, true);
        assert.equal(result.audit.employee_name, 'Daniel Amoah');
        assert.equal(result.audit.employee_id, 'RCPL0088');
        assert.equal(result.audit.department, 'Production');
        assert.equal(result.audit.job_title, 'Senior Technical Operator');
        assert.equal(result.audit.perspective_count, 3);
        assert.equal(result.audit.kpi_count, 7);

        // All 7 KPIs attained 100% -> overall attainment = 100% -> 4.0 on 5pt scale (STRONG)
        assert.equal(result.audit.meridian_attainment_pct, 100);
        assert.equal(result.audit.meridian_d1_score_5pt, 4.0);
        assert.equal(result.audit.meridian_band, 'STRONG');

        // Source rounded KPI score sum (98%) vs Meridian attainment (100%) delta is 2%, triggering reconciliation gate
        assert.equal(result.reconciliation.within_tolerance, false);
        assert.equal(result.reconciliation.material_difference_flag, true);

        // Segregation of duties: Ethirajulu Mohan signed as BOTH Counter-Signer and ARC, failing Rule 24
        assert.equal(result.audit.sod_passed, false);
        assert.ok(result.markdownReport.length > 500);
    });

    it('Executes Gifty Kwarko (RCPL0048) through end-to-end pipeline', async () => {
        if (!fs.existsSync(giftyPdfPath)) {
            console.warn('Skipping Gifty Kwarko test: file not found at', giftyPdfPath);
            return;
        }

        const buffer = fs.readFileSync(giftyPdfPath);
        const result = await runPipeline({
            buffer,
            filename: 'gifty_kwarko.pdf',
            orgId: 'rcpl',
            pdfFinalScore: 79,
        });

        assert.equal(result.success, true);
        assert.equal(result.audit.employee_name, 'Gifty Kwarko');
        assert.equal(result.audit.employee_id, 'RCPL0048');
        assert.equal(result.audit.department, 'Sales');
        assert.equal(result.audit.job_title, 'GM Sales');
        assert.equal(result.audit.perspective_count, 4);
        assert.equal(result.audit.kpi_count, 15);

        // 79% score reconciliation within tolerance
        const attain = result.audit.meridian_attainment_pct ?? 0;
        assert.ok(attain >= 75 && attain <= 85);
        assert.ok(['STRONG', 'MEETS'].includes(result.audit.meridian_band));

        // Reviewer (Hussein Iddrisu) != ARC (Sally Osei-Boateng)
        assert.equal(result.audit.sod_passed, true);
        assert.ok(result.markdownReport.length > 500);
    });
});
