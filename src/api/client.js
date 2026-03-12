const API_BASE = '/api';

const STYLE_KEYS = ['competing', 'collaborating', 'compromising', 'avoiding', 'accommodating'];

const PATTERN_MAP = {
    criticism: 'criticism',
    contempt: 'contempt',
    defensiveness: 'defensiveness',
    stonewalling: 'stonewalling',
    none: null,
    critic: 'criticism',
    defensive: 'defensiveness',
    批评: 'criticism',
    蔑视: 'contempt',
    轻蔑: 'contempt',
    防御: 'defensiveness',
    石墙: 'stonewalling',
    冷战: 'stonewalling',
    无: null,
};

function firstDefined(...values) {
    return values.find(value => value !== undefined && value !== null);
}

function stringifyList(value) {
    if (Array.isArray(value)) return value.join('、');
    if (value === undefined || value === null) return '';
    return String(value);
}

function normalizePattern(pattern) {
    if (!pattern) return null;
    return PATTERN_MAP[String(pattern).toLowerCase?.() || pattern] ?? PATTERN_MAP[pattern] ?? pattern;
}

function normalizeScores(scores = {}) {
    return STYLE_KEYS.reduce((acc, key) => {
        const raw = firstDefined(scores[key], scores[key.toLowerCase?.()]);
        acc[key] = Number(raw) || 0;
        return acc;
    }, {});
}

function normalizeAssessmentPerson(person = {}) {
    return {
        primaryStyle: firstDefined(person.primaryStyle, person.primary, ''),
        secondaryStyle: firstDefined(person.secondaryStyle, person.secondary, ''),
        description: firstDefined(person.description, ''),
        strengths: stringifyList(person.strengths),
        blindspots: stringifyList(person.blindspots),
        scores: normalizeScores(firstDefined(person.scores, person.score_breakdown, {})),
    };
}

function normalizeAssessmentResponse(data = {}) {
    return {
        self: normalizeAssessmentPerson(firstDefined(data.self, data.self_style, {})),
        other: normalizeAssessmentPerson(firstDefined(data.other, data.other_style, {})),
        dynamicAnalysis: firstDefined(data.dynamicAnalysis, data.dynamic_analysis, ''),
    };
}

function normalizeDialogueResponse(data = {}, context = {}) {
    const rawLines = Array.isArray(data.lines) ? data.lines : Array.isArray(data.dialogue) ? data.dialogue : [];

    return {
        lines: rawLines.map(line => {
            const hasPattern = Boolean(firstDefined(line.has_pattern, line.hasPattern, false));
            const pattern = normalizePattern(firstDefined(line.pattern, line.pattern_type, line.pattern_label));
            const speaker = line.speaker === 'self'
                ? context.selfName
                : line.speaker === 'other'
                    ? context.otherName
                    : line.speaker;

            return {
                speaker: speaker || '',
                text: firstDefined(line.text, ''),
                pattern: hasPattern ? pattern : null,
                explanation: firstDefined(line.explanation, line.pattern_explanation, ''),
            };
        }),
        overallAnalysis: firstDefined(data.overallAnalysis, data.overall_analysis, ''),
    };
}

function normalizeRewriteResponse(data = {}) {
    const nvc = firstDefined(data.nvc, data.nvc_analysis, {});

    return {
        score: Number(firstDefined(data.score, 0)) || 0,
        feedback: firstDefined(data.feedback, ''),
        encouragement: firstDefined(data.encouragement, ''),
        suggestion: firstDefined(data.suggestion, ''),
        nvc: {
            observation: Boolean(firstDefined(nvc.observation, nvc.has_observation, false)),
            feeling: Boolean(firstDefined(nvc.feeling, nvc.has_feeling, false)),
            need: Boolean(firstDefined(nvc.need, nvc.has_need, false)),
            request: Boolean(firstDefined(nvc.request, nvc.has_request, false)),
        },
    };
}

function normalizeHintResponse(data = {}) {
    return {
        hint: firstDefined(data.hint, ''),
        focus: firstDefined(data.focus, ''),
        starter: firstDefined(data.starter, ''),
    };
}

function normalizeSummaryResponse(data = {}) {
    const conflictProfile = firstDefined(data.conflictProfile, data.conflict_profile, {});
    const patterns = firstDefined(data.patterns, data.patterns_identified, []);
    const growthHighlights = firstDefined(data.growthHighlights, data.growth_highlights, []);
    const actionPlan = firstDefined(data.actionPlan, data.action_plan, []);
    const toolkit = firstDefined(data.toolkit, data.communication_toolkit, []);

    return {
        conflictProfile: {
            title: firstDefined(conflictProfile.title, ''),
            description: firstDefined(conflictProfile.description, conflictProfile.dynamic_summary, ''),
        },
        patterns: Array.isArray(patterns)
            ? patterns.map(item => ({
                name: firstDefined(item.name, item.pattern, ''),
                description: firstDefined(item.description, item.impact, item.example, ''),
                frequency: firstDefined(item.frequency, ''),
            }))
            : [],
        growthHighlights: Array.isArray(growthHighlights)
            ? growthHighlights.map(item => (
                typeof item === 'string'
                    ? item
                    : [item.area, item.detail].filter(Boolean).join(': ')
            ))
            : [],
        actionPlan: Array.isArray(actionPlan)
            ? actionPlan.map(item => ({
                action: firstDefined(item.action, item.tip, ''),
                detail: firstDefined(item.detail, ''),
                example: firstDefined(item.example, item.example_phrase, ''),
            }))
            : [],
        toolkit: Array.isArray(toolkit) ? toolkit : [],
        closingMessage: firstDefined(data.closingMessage, data.closing_message, ''),
    };
}

async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
}

export async function assessStyles(data) {
    const result = await request('/assess', { method: 'POST', body: JSON.stringify(data) });
    return normalizeAssessmentResponse(result);
}

export async function generateDialogue(data) {
    const result = await request('/dialogue/generate', { method: 'POST', body: JSON.stringify(data) });
    return normalizeDialogueResponse(result, data);
}

export async function submitReflection(data) {
    return request('/dialogue/reflect', { method: 'POST', body: JSON.stringify(data) });
}

export async function submitRewrite(data) {
    const result = await request('/practice/rewrite', { method: 'POST', body: JSON.stringify(data) });
    return normalizeRewriteResponse(result);
}

export async function getHint(data) {
    const result = await request('/practice/hint', { method: 'POST', body: JSON.stringify(data) });
    return normalizeHintResponse(result);
}

export async function generateSummary(data) {
    const result = await request('/summary', { method: 'POST', body: JSON.stringify(data) });
    return normalizeSummaryResponse(result);
}
