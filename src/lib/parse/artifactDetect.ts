/**
 * PHASE 4 — PARSER IMPLEMENTATION §4.4 Step 5
 * Artifact / Degenerate Page Detection (grids of identical tokens)
 */

export interface ArtifactCheckResult {
    isArtifact: boolean;
    tokenCount: number;
    uniqueTokens: number;
    entropy: number;
}

export function isArtifact(pageText: string): boolean {
    return checkArtifact(pageText).isArtifact;
}

export function checkArtifact(pageText: string): ArtifactCheckResult {
    const tokens = pageText.trim().split(/\s+/).filter(t => t.length > 0);
    const tokenCount = tokens.length;

    if (tokenCount < 100) {
        return { isArtifact: false, tokenCount, uniqueTokens: new Set(tokens).size, entropy: 1.0 };
    }

    const uniqueTokens = new Set(tokens).size;
    const entropy = uniqueTokens / tokenCount;

    // Spec §1.11 & §4.4: If entropy < 0.1 and token count > 100, flag as artifact
    const isDegenerate = entropy < 0.1;

    return {
        isArtifact: isDegenerate,
        tokenCount,
        uniqueTokens,
        entropy: Math.round(entropy * 1000) / 1000,
    };
}
