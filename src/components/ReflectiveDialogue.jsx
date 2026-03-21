import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';
import { generateDialogue, checkAnnotation, getAnnotationSummary } from '../api/client';

const BEHAVIORS = [
    'criticism', 'contempt', 'defensiveness', 'stonewalling',
    'blaming', 'invalidation', 'mind_reading',
    'overgeneralizing', 'demanding', 'passive_aggression', 'interrupting',
];

export default function ReflectiveDialogue() {
    const { state, dispatch } = useApp();
    const { t, lang } = useLang();
    const td = t.dialogue;
    const assessment = state.assessment || state.conflictStyles;

    const [phase, setPhase] = useState('loading'); // loading | annotating | results
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [annotations, setAnnotations] = useState({});
    const [checkResults, setCheckResults] = useState(null);
    const [summaryData, setSummaryData] = useState(null);
    const [reflectionText, setReflectionText] = useState('');
    const [reflectionSaved, setReflectionSaved] = useState(false);

    const lines = state.dialogue?.lines || [];

    useEffect(() => {
        if (!state.dialogue) {
            loadDialogue();
        } else {
            setPhase('annotating');
        }
    }, [state.dialogue]);

    async function loadDialogue() {
        setLoading(true);
        setError(null);
        try {
            const result = await generateDialogue({
                scenario: state.scenario.description,
                selfName: state.scenario.selfName,
                otherName: state.scenario.otherName,
                relationship: state.scenario.relationship,
                selfStyle: assessment?.self,
                otherStyle: assessment?.other,
                language: lang,
            });
            dispatch({ type: 'SET_DIALOGUE', payload: result });
            setPhase('annotating');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleAnnotation = (idx, value) => {
        setAnnotations(prev => ({ ...prev, [idx]: value || null }));
    };

    const handleSubmitAnnotations = async () => {
        setLoading(true);
        setError(null);
        dispatch({ type: 'SET_ALL_ANNOTATIONS', payload: annotations });
        try {
            const [checkResult, summaryResult] = await Promise.all([
                checkAnnotation({ lines, userAnnotations: annotations, language: lang }),
                getAnnotationSummary({ lines, userAnnotations: annotations, language: lang }),
            ]);
            setCheckResults(checkResult);
            setSummaryData(summaryResult);
            dispatch({ type: 'SET_ANNOTATION_RESULTS', payload: checkResult });
            setPhase('results');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const allAnnotated = lines.length > 0;

    const handleSaveReflection = async () => {
        if (!reflectionText.trim()) return;
        dispatch({ type: 'ADD_REFLECTION', payload: reflectionText });
        setReflectionSaved(true);
    };

    if (phase === 'loading' || (loading && !state.dialogue)) {
        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                {error ? (
                    <>
                        <p style={{ color: 'var(--accent-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
                        <button className="btn btn--primary" onClick={loadDialogue}>{td.retryBtn}</button>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
                        <Loader2 size={20} className="spin" />
                        <span>{td.loadingText}</span>
                    </div>
                )}
            </motion.div>
        );
    }

    if (phase === 'annotating') {
        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="section-title">{td.title}</h2>
                <p className="section-subtitle">{td.subtitle}</p>

                {state.dialogue?.overallAnalysis && (
                    <div className="glass-card--flat" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            {td.overallAnalysis} {state.dialogue.overallAnalysis}
                        </p>
                    </div>
                )}

                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                    {td.annotationInstruction}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {lines.map((line, idx) => {
                        const isSelf = line.speaker === state.scenario.selfName;
                        return (
                            <motion.div key={idx}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                style={{
                                    display: 'flex',
                                    flexDirection: isSelf ? 'row-reverse' : 'row',
                                    gap: 'var(--space-3)',
                                    alignItems: 'flex-start',
                                }}>
                                <div style={{
                                    flex: '0 0 auto',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: isSelf ? 'var(--gradient-primary)' : 'var(--bg-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 600,
                                    color: isSelf ? '#fff' : 'var(--text-secondary)',
                                }}>
                                    {line.speaker?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div style={{
                                    maxWidth: '70%',
                                    background: isSelf ? 'rgba(124, 92, 252, 0.1)' : 'var(--bg-secondary)',
                                    padding: 'var(--space-3) var(--space-4)',
                                    borderRadius: 'var(--radius-lg)',
                                }}>
                                    <p style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-tertiary)',
                                        marginBottom: 'var(--space-1)',
                                    }}>
                                        {line.speaker}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                                        {line.text}
                                    </p>
                                    <select
                                        value={annotations[idx] || ''}
                                        onChange={e => handleAnnotation(idx, e.target.value || null)}
                                        style={{
                                            marginTop: 'var(--space-2)',
                                            width: '100%',
                                            padding: 'var(--space-1) var(--space-2)',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-primary)',
                                            background: 'var(--bg-primary)',
                                            color: annotations[idx] ? 'var(--text-accent)' : 'var(--text-tertiary)',
                                            fontSize: 'var(--font-size-xs)',
                                        }}>
                                        <option value="">{td.noneLabel}</option>
                                        {BEHAVIORS.map(b => (
                                            <option key={b} value={b}>
                                                {td.behaviorLabels[b]} - {td.behaviorDescriptions[b]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div style={{ marginTop: 'var(--space-8)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn--primary" onClick={handleSubmitAnnotations}
                        disabled={!allAnnotated || loading}>
                        {loading ? (
                            <><Loader2 size={16} className="spin" /> {td.submittingAnnotations}</>
                        ) : td.submitAnnotations}
                    </button>
                </div>

                {error && <p style={{ color: 'var(--accent-danger)', marginTop: 'var(--space-4)' }}>{error}</p>}
            </motion.div>
        );
    }

    if (phase === 'results') {
        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="section-title">{td.title}</h2>

                {checkResults && (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--space-6)',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-6)',
                    }}>
                        <h3 style={{ color: 'var(--text-accent)', marginBottom: 'var(--space-2)' }}>{td.accuracyTitle}</h3>
                        <p style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 700,
                            color: checkResults.accuracy >= 70 ? 'var(--accent-success)' : checkResults.accuracy >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)',
                        }}>
                            {td.accuracyScore(checkResults.accuracy)}
                        </p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                            {checkResults.correct} / {checkResults.total}
                        </p>
                    </div>
                )}

                {summaryData && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                        <div className="glass-card--flat" style={{ padding: 'var(--space-4)' }}>
                            <h4 style={{ color: 'var(--accent-success)', marginBottom: 'var(--space-2)' }}>{td.strengthsTitle}</h4>
                            <ul style={{ fontSize: 'var(--font-size-sm)', paddingLeft: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                                {(summaryData.strengths || []).map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                        </div>
                        <div className="glass-card--flat" style={{ padding: 'var(--space-4)' }}>
                            <h4 style={{ color: 'var(--accent-warning)', marginBottom: 'var(--space-2)' }}>{td.weaknessesTitle}</h4>
                            <ul style={{ fontSize: 'var(--font-size-sm)', paddingLeft: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                                {(summaryData.weaknesses || []).map((item, idx) => <li key={idx}>{item}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                    {checkResults?.results?.map((result, idx) => {
                        const line = lines[idx];
                        return (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-3)',
                                padding: 'var(--space-2) var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                background: result.correct ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                                border: `1px solid ${result.correct ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            }}>
                                {result.correct ? <CheckCircle size={16} color="var(--accent-success)" /> : <XCircle size={16} color="var(--accent-danger)" />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-secondary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        <strong>{line?.speaker}</strong>: {line?.text}
                                    </p>
                                    {!result.correct && (
                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                                            {td.yourLabel}: {result.userLabel ? (td.behaviorLabels[result.userLabel] || result.userLabel) : td.noneLabel}
                                            {' -> '}
                                            {td.aiLabel}: {result.aiLabel ? (td.behaviorLabels[result.aiLabel] || result.aiLabel) : td.noneLabel}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="glass-card--flat" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                    <h4 style={{ marginBottom: 'var(--space-2)' }}>{td.reflectionPrompt}</h4>
                    <textarea className="form-textarea" rows={3} placeholder={td.reflectionPlaceholder}
                        value={reflectionText} onChange={e => { setReflectionText(e.target.value); setReflectionSaved(false); }} />
                    {reflectionText.trim() && (
                        <button className="btn btn--secondary" onClick={handleSaveReflection}
                            disabled={reflectionSaved} style={{ marginTop: 'var(--space-2)' }}>
                            {reflectionSaved ? td.reflectionSaved : td.saveReflection}
                        </button>
                    )}
                </div>

                <button className="btn btn--primary btn--large" style={{ width: '100%' }}
                    onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}>
                    {td.nextStep}
                </button>
            </motion.div>
        );
    }

    return null;
}
