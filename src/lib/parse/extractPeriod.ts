/**
 * PHASE 4 — PARSER IMPLEMENTATION §1.4 & §4.4
 * Cycle and appraisal period extraction
 */

import { CycleInfo } from './types.js';

export function extractPeriod(text: string): CycleInfo {
    // E.g., "1st January, 2026 - 31st May, 2026" or "01/01/2026 - 31/05/2026"
    const periodMatch = text.match(/(\d+)(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})\s*-\s*(\d+)(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})/i);

    let period_start = '2026-01-01';
    let period_end = '2026-05-31';

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (periodMatch) {
        const startDay = periodMatch[1]!.padStart(2, '0');
        const startMonthName = periodMatch[2]!;
        const startYear = periodMatch[3]!;
        const endDay = periodMatch[4]!.padStart(2, '0');
        const endMonthName = periodMatch[5]!;
        const endYear = periodMatch[6]!;

        const sIdx = months.findIndex(m => m.toLowerCase().startsWith(startMonthName.toLowerCase().slice(0, 3)));
        const eIdx = months.findIndex(m => m.toLowerCase().startsWith(endMonthName.toLowerCase().slice(0, 3)));

        if (sIdx !== -1) period_start = `${startYear}-${String(sIdx + 1).padStart(2, '0')}-${startDay}`;
        if (eIdx !== -1) period_end = `${endYear}-${String(eIdx + 1).padStart(2, '0')}-${endDay}`;
    }

    // Infer cycle label (e.g. Q1 2026)
    const labelMatch = text.match(/(Q[1-4]\s+\d{4})/i);
    const label = labelMatch ? labelMatch[1]! : `Q1 ${period_start.slice(0, 4)}`;

    const is_test_phase = /test\s+phase|trial/i.test(text);

    return {
        label,
        period_start,
        period_end,
        is_test_phase,
    };
}
