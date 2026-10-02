/**
 * PHASE 4 — PARSER IMPLEMENTATION §4.4 Step 2
 * Page Classification for SeamlessHR appraisal documents
 */

import { isArtifact } from './artifactDetect.js';

export type PageType =
    | 'COVER'
    | 'PERIOD'
    | 'STRUCTURE'
    | 'PERSPECTIVE_START'
    | 'KPI_BLOCK'
    | 'COMMENT_BLOCK'
    | 'SIGNATURE'
    | 'ARTIFACT'
    | 'BLANK';

export function classifyPage(pageText: string, _pageNum: number): PageType {
    const t = pageText.trim();

    if (t.length === 0) return 'BLANK';
    if (isArtifact(t)) return 'ARTIFACT';
    if (/(?:^|\n)\s*SIGNATURES/i.test(t)) return 'SIGNATURE';
    if (/\d+\s+Perspective\s+\d+\s+Objectives/i.test(t)) return 'STRUCTURE';
    if (/\d+(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}\s*-\s*\d+(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}/i.test(t) && /APPRAISAL PERIOD/i.test(t)) {
        return 'PERIOD';
    }
    if (/^##\s+\w+/m.test(t) || /Weight of Perspective:/i.test(t)) {
        return 'PERSPECTIVE_START';
    }
    if (/Entire Cycle\s+Type\s+\d+/i.test(t)) return 'KPI_BLOCK';
    if (/COMMENT\(S\)\s+FOR\s+KPI/i.test(t)) return 'COMMENT_BLOCK';
    if (/Royal Crown Packaging Company Limited/i.test(t) && t.length < 300) return 'COVER';

    return 'BLANK';
}
