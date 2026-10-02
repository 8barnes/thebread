/**
 * PHASE 4 — PARSER IMPLEMENTATION §4.4 Step 7
 * Normalization utilities for numbers, currencies, and timestamps.
 */

export function normalizeNumber(s: string | null | undefined): number | null {
    if (!s) return null;
    const cleaned = s.replace(/[,\s%GHS$]/gi, '').trim();
    if (cleaned.length === 0) return null;
    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? null : num;
}

export function normalizeTimestamp(m: RegExpMatchArray | string): string | null {
    if (typeof m === 'string') {
        const regex = /(\d+)(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})[.,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i;
        const match = m.match(regex);
        if (!match) return null;
        return parseMatchedTimestamp(match);
    }
    return parseMatchedTimestamp(m);
}

function parseMatchedTimestamp(match: RegExpMatchArray): string | null {
    try {
        const day = match[1];
        const month = match[2];
        const year = match[3];
        const hour = match[4];
        const minute = match[5];
        const meridiem = match[7];

        if (!day || !month || !year || !hour || !minute) return null;

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthIdx = months.findIndex(mm => mm.toLowerCase().startsWith(month.toLowerCase().slice(0, 3)));
        if (monthIdx === -1) return null;

        let hour24 = parseInt(hour, 10);
        if (meridiem) {
            const meriUpper = meridiem.toUpperCase();
            if (meriUpper === 'PM' && hour24 < 12) hour24 += 12;
            if (meriUpper === 'AM' && hour24 === 12) hour24 = 0;
        }

        const yyyy = year.padStart(4, '0');
        const mm = String(monthIdx + 1).padStart(2, '0');
        const dd = day.padStart(2, '0');
        const hh = String(hour24).padStart(2, '0');
        const min = minute.padStart(2, '0');

        return `${yyyy}-${mm}-${dd}T${hh}:${min}:00Z`;
    } catch {
        return null;
    }
}
