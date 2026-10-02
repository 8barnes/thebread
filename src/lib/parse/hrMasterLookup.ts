/**
 * PHASE 4 — PARSER IMPLEMENTATION §4.4 Step 6
 * HR Master Lookup integration
 */

import { HrMasterMatchStatus } from './types.js';

export interface HrMasterCandidate {
    id: string;
    name: string;
    department?: string | null;
    job_title?: string | null;
}

export interface HrMasterClient {
    findByName(name: string): Promise<HrMasterCandidate[]>;
}

export interface HrLookupResult {
    employee_id: string | null;
    match: HrMasterMatchStatus;
    candidate?: HrMasterCandidate;
    candidates?: HrMasterCandidate[];
}

export async function lookupEmployee(
    name: string,
    hrMaster: HrMasterClient
): Promise<HrLookupResult> {
    const trimmed = name.trim();
    if (!trimmed) {
        return { employee_id: null, match: 'NONE' };
    }

    const candidates = await hrMaster.findByName(trimmed);

    if (candidates.length === 0) {
        return { employee_id: null, match: 'NONE' };
    }
    if (candidates.length === 1) {
        const c = candidates[0]!;
        return { employee_id: c.id, match: 'EXACT', candidate: c };
    }
    return { employee_id: null, match: 'MULTIPLE', candidates };
}
