/**
 * MERIDIAN ENTERPRISE PLATFORM
 * §33 — D2 Behaviour / How Work Was Achieved
 * Evaluates competencies, self vs reviewer perception gap, and behavioural performance.
 */

import type { NormalizedAppraisal } from '../parse/types.js';
import { scoreToMeridianBand } from './d1.js';
import type { D2BehaviorEvaluation, EvaluatedCompetency } from './types.js';

export function evaluateD2(record: NormalizedAppraisal): D2BehaviorEvaluation {
    const rawCompetencies = record.competencies ?? [];

    if (rawCompetencies.length === 0) {
        return {
            competencies: [],
            average_reviewer_rating_5pt: null,
            average_self_rating_5pt: null,
            overall_d2_score_5pt: null,
            competency_count: 0,
            status: 'SOFT_ABSENT',
            category: 'MEETS', // neutral default when absent
        };
    }

    const evaluated: EvaluatedCompetency[] = [];
    let reviewerSum = 0;
    let reviewerCount = 0;
    let selfSum = 0;
    let selfCount = 0;

    for (const comp of rawCompetencies) {
        const rev = comp.reviewer_rating;
        const self = comp.self_rating;
        const gap = rev !== null && self !== null ? Math.round((self - rev) * 100) / 100 : null;

        if (rev !== null && !Number.isNaN(rev)) {
            reviewerSum += rev;
            reviewerCount++;
        }
        if (self !== null && !Number.isNaN(self)) {
            selfSum += self;
            selfCount++;
        }

        evaluated.push({
            name: comp.name,
            self_rating: self,
            reviewer_rating: rev,
            gap,
        });
    }

    const avgReviewer = reviewerCount > 0 ? Math.round((reviewerSum / reviewerCount) * 100) / 100 : null;
    const avgSelf = selfCount > 0 ? Math.round((selfSum / selfCount) * 100) / 100 : null;

    const status = evaluated.length < 4 ? 'INSUFFICIENT' : 'COMPLETE';
    const category = scoreToMeridianBand(avgReviewer);

    return {
        competencies: evaluated,
        average_reviewer_rating_5pt: avgReviewer,
        average_self_rating_5pt: avgSelf,
        overall_d2_score_5pt: avgReviewer,
        competency_count: evaluated.length,
        status,
        category,
    };
}
