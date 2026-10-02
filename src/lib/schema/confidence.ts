/**
 * PHASE 2 — EXTENDED PARSE SCHEMA §2.7 Confidence Scoring
 * Pure functions to calculate and enforce confidence scores across fields.
 */

import { HrMasterMatchStatus } from '../parse/types.js';

export const ConfidenceRules = {
    employeeName(fromHeader: boolean): number {
        return fromHeader ? 1.0 : 0.7;
    },

    employeeId(matchStatus: HrMasterMatchStatus): number {
        switch (matchStatus) {
            case 'EXACT':
                return 1.0;
            case 'MULTIPLE':
                return 0.5;
            case 'NONE':
            default:
                return 0.0;
        }
    },

    cyclePeriod(explicitDateRange: boolean): number {
        return explicitDateRange ? 1.0 : 0.5;
    },

    perspectiveWeight(weightPresent: boolean): number {
        return weightPresent ? 1.0 : 0.0;
    },

    kpiTargetOrActual(parsedCleanly: boolean): number {
        return parsedCleanly ? 1.0 : 0.8;
    },

    kpiWeight(weightPresent: boolean): number {
        return weightPresent ? 1.0 : 0.0;
    },

    kpiComment(hasProseBlock: boolean): number {
        return hasProseBlock ? 1.0 : 0.5;
    },

    signatureSignedAt(hasTime: boolean): number {
        return hasTime ? 1.0 : 0.7;
    },

    /**
     * Compute composite KPI confidence based on present constituent fields
     */
    computeKpiConfidence(params: {
        targetParsedCleanly: boolean;
        actualParsedCleanly: boolean;
        weightPresent: boolean;
        hasComment: boolean;
        commentHasProse: boolean;
    }): number {
        const scores: number[] = [
            params.targetParsedCleanly ? 1.0 : 0.8,
            params.actualParsedCleanly ? 1.0 : 0.8,
            params.weightPresent ? 1.0 : 0.8,
        ];

        if (params.hasComment) {
            scores.push(params.commentHasProse ? 1.0 : 0.5);
        }

        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        return Math.round(avg * 100) / 100;
    },
};
