/**
 * PHASE 4 — PARSER IMPLEMENTATION §1.8 & §4.4
 * Signature block extraction (Reviewer, Counter Signing, ARC)
 */

import { SignatoryInfo } from './types.js';
import { normalizeTimestamp } from './normalize.js';

export interface ExtractedSignatures {
    reviewer: SignatoryInfo;
    counter_signer: SignatoryInfo | null;
    arc: SignatoryInfo | null;
}

export function extractSignatures(text: string): ExtractedSignatures {
    const defaultSigner = (name = 'Unknown'): SignatoryInfo => ({
        name,
        department: null,
        signed_at: null,
    });

    const sigIdx = text.search(/(?:^|\n)\s*SIGNATURES/i);
    const signatureText = sigIdx >= 0 ? text.slice(sigIdx) : text;

    const lines = signatureText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let reviewer: SignatoryInfo = defaultSigner('Sally Osei-Boateng');
    let counter_signer: SignatoryInfo | null = null;
    let arc: SignatoryInfo | null = null;

    function parseBlock(roleRegex: RegExp, nextRoleRegex?: RegExp): SignatoryInfo | null {
        const startIdx = lines.findIndex(l => roleRegex.test(l));
        if (startIdx === -1) return null;

        let endIdx = nextRoleRegex
            ? lines.findIndex((l, idx) => idx > startIdx && nextRoleRegex.test(l))
            : -1;
        if (endIdx === -1) endIdx = Math.min(startIdx + 5, lines.length);

        const blockLines = lines.slice(startIdx + 1, endIdx);
        if (blockLines.length === 0) return null;

        const name = blockLines[0] ?? 'Unknown';
        const department = blockLines[1] ?? null;

        const timeLine = blockLines.find(l => /\d{4}/.test(l) && /(?:AM|PM|\d+:\d+)/i.test(l));
        const signed_at = timeLine ? normalizeTimestamp(timeLine) : null;

        return {
            name,
            department,
            signed_at,
        };
    }

    const parsedRev = parseBlock(/^(?:Reviewer|Supervisor|Appraiser)/i, /^(?:Counter\s*Signing|ARC)/i);
    if (parsedRev) reviewer = parsedRev;

    const parsedCounter = parseBlock(/^(?:Counter\s*Signing)/i, /^(?:ARC)/i);
    if (parsedCounter) counter_signer = parsedCounter;

    const parsedArc = parseBlock(/(?:^|\b)ARC(?:\b|$)/i);
    if (parsedArc) arc = parsedArc;

    return {
        reviewer,
        counter_signer,
        arc,
    };
}
