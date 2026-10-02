/**
 * PHASE 4 — PARSER IMPLEMENTATION §1.7 & §4.4
 * Perspective extraction from SeamlessHR text blocks
 */

import { PerspectiveRecord, SourceRef } from './types.js';
import { normalizeNumber } from './normalize.js';
import { STANDARD_BSC_PERSPECTIVES } from '../schema/normalizedAppraisal.js';

export function extractPerspective(
    text: string,
    filename: string,
    page: number
): PerspectiveRecord | null {
    // Detect "## <Perspective Name>" or standalone header
    const nameMatch = text.match(/##\s+([^\n\r]+)/) || text.match(/(Financial|Customer|Internal Process(?:es)?|Learning and Growth|Learning & Growth|[A-Z][A-Za-z\s&.]+Perspective)/i);
    if (!nameMatch) return null;

    const rawName = nameMatch[1]!.trim();

    // Detect "Weight of Perspective: <N>"
    const weightMatch = text.match(/Weight of Perspective:\s*(\d+[\d,.]*)/i);
    const weight = weightMatch ? normalizeNumber(weightMatch[1]) : null;

    const source: SourceRef = {
        document: filename,
        page,
        row: null,
        field: weight !== null ? 'perspective_weight' : 'perspective_name',
    };

    const is_standard_bsc = STANDARD_BSC_PERSPECTIVES.includes(rawName.toLowerCase());

    return {
        name: rawName,
        weight,
        is_standard_bsc,
        source,
        confidence: weight !== null ? 1.0 : 0.0,
    };
}
