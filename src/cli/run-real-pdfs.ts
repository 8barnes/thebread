/**
 * CLI EXECUTOR FOR REAL SEAMLESSHR APPRAISAL PDFS
 *
 * Runs Daniel Amoah and Gifty Kwarko through the full Meridian Pipeline
 * and outputs comprehensive audit reports.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { runPipeline } from '../lib/pipeline/runPipeline.js';

async function main() {
    console.log('======================================================================');
    console.log('   MERIDIAN ENTERPRISE PIPELINE — REAL SEAMLESSHR EVALUATION RUNNER   ');
    console.log('======================================================================\n');

    const downloadsDir = 'c:/Users/paa.barnes/Downloads';
    const outputDir = path.resolve(downloadsDir, 'Scoreview Analysis/reports');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const targets = [
        {
            filename: 'daniel_amoah.pdf',
            path: path.join(downloadsDir, 'daniel_amoah.pdf'),
            expectedFinalScore: 100,
        },
        {
            filename: 'gifty_kwarko.pdf',
            path: path.join(downloadsDir, 'gifty_kwarko.pdf'),
            expectedFinalScore: 79,
        },
    ];

    for (const target of targets) {
        console.log(`\n----------------------------------------------------------------------`);
        console.log(`>>> PROCESSING: ${target.filename}`);
        console.log(`----------------------------------------------------------------------`);

        if (!fs.existsSync(target.path)) {
            console.error(`File not found: ${target.path}`);
            continue;
        }

        const buffer = fs.readFileSync(target.path);
        const startTime = Date.now();

        const result = await runPipeline({
            buffer,
            filename: target.filename,
            orgId: 'rcpl',
            pdfFinalScore: target.expectedFinalScore,
        });

        const duration = Date.now() - startTime;

        console.log(`\n✅ Pipeline Execution Successful in ${duration}ms:`);
        console.log(`  - Employee:        ${result.audit.employee_name} (${result.audit.employee_id})`);
        console.log(`  - Department:      ${result.audit.department}`);
        console.log(`  - Role:            ${result.audit.job_title}`);
        console.log(`  - Cycle:           ${result.audit.cycle_label} (${result.audit.cycle_period})`);
        console.log(`  - Test Phase:      ${result.audit.is_test_phase ? 'YES (flagged in ARIG)' : 'NO'}`);
        console.log(`  - Perspectives:    ${result.audit.perspective_count}`);
        console.log(`  - Total KPIs:      ${result.audit.kpi_count}`);
        console.log(`  - Source Final:    ${result.audit.source_final_score !== null ? result.audit.source_final_score + '%' : 'N/A'}`);
        console.log(`  - Meridian Attain: ${result.audit.meridian_attainment_pct !== null ? result.audit.meridian_attainment_pct.toFixed(2) + '%' : 'N/A'} (Δ = ${(result.reconciliation.source_vs_meridian_delta ?? 0).toFixed(2)}%)`);
        console.log(`  - 5-Point Scale:   ${result.audit.meridian_d1_score_5pt !== null ? result.audit.meridian_d1_score_5pt.toFixed(2) : 'N/A'} / 5.00 [${result.audit.meridian_band}]`);
        console.log(`  - Tolerance Gate:  ${result.reconciliation.within_tolerance ? '✅ PASS (within ±1.0%)' : '⚠️ MATERIAL DISCREPANCY'}`);
        console.log(`  - ARIG Quality:    ${result.audit.arig_quality_score.toFixed(1)}%`);
        console.log(`  - ARIG Hard Lock:  ${result.audit.arig_hard_locked ? '🔴 LOCKED' : '🟢 PASSED'}`);
        console.log(`  - SoD Passed:      ${result.audit.sod_passed ? '✅ YES' : '❌ FAILED'}`);

        // Write report file
        const reportFilename = target.filename.replace('.pdf', '_evaluation_report.md');
        const reportPath = path.join(outputDir, reportFilename);
        fs.writeFileSync(reportPath, result.markdownReport, 'utf-8');
        console.log(`\n  📄 Report saved to: ${reportPath}`);
    }

    console.log('\n======================================================================');
    console.log('   EVALUATION PIPELINE COMPLETED SUCCESSFULLY FOR ALL TARGETS         ');
    console.log('======================================================================\n');
}

main().catch(err => {
    console.error('Pipeline failed:', err);
    process.exit(1);
});
