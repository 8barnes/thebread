/**
 * PHASE 4 — PARSER IMPLEMENTATION §4.4 Step 4
 * Type inference from KPI title and objective text
 */

import { KpiType } from './types.js';

export interface InferencePattern {
    pattern: RegExp;
    type: KpiType;
}

export const INFERENCE_PATTERNS: InferencePattern[] = [
    { pattern: /reduce|decrease|lower|minimize|eliminate|avoid|prevent|absenteeism|overtime|waste/i, type: 'TYPE_2_LESS_MEANS_MORE' },
    { pattern: /zero\s+(?:\w+\s+)*(?:incident|defect|error|accident|injury|injuries)|no\s+(?:\w+\s+)*(?:incident|defect|error|accident|injury)/i, type: 'TYPE_3_LESS_OR_NOTHING' },
    { pattern: /compliance|certification|approval|complete|audit|closure/i, type: 'TYPE_4_ALL_OR_NOTHING' },
    { pattern: /incident|violation|accident|injury|safety/i, type: 'TYPE_5_NEGATIVE_SCORING' },
    { pattern: /satisfaction|engagement|rating|feedback|nps|csat/i, type: 'TYPE_8_RATING_SCALE' },
    { pattern: /increase|improve|grow|achieve|maximize|deliver|maintain|ensure|utili[sz]ation/i, type: 'TYPE_1_HIGHER_BETTER' },
];

export function inferKpiType(title: string, objective: string): KpiType {
    const text = `${title} ${objective}`.toLowerCase();
    for (const { pattern, type } of INFERENCE_PATTERNS) {
        if (pattern.test(text)) {
            return type;
        }
    }
    return 'UNKNOWN';
}
