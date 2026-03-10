import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';
import { generateDialogue, submitReflection } from '../api/client';

export default function ReflectiveDialogue() {
    const { state, dispatch } = useApp();
    const { t, lang } = useLang();
    const td = t.dialogue;

    const [dialogue, setDialogue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedLine, setExpandedLine] = useState(null);
    const [reflections, setReflections] = useState({});
    const [reflectionText, setReflectionText] = useState('');
    const [reflectingIdx, setReflectingIdx] = useState(null);
    const [reflectionFeedback, setReflectionFeedback] = useState({});

    useEffect(() => {
        loadDialogue();
    }, []);

    const loadDialogue = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await generateDialogue({
                scenario: state.scenario.description,
                selfName: state.scenario.selfName,
                otherName: state.scenario.otherName,
                relationship: state.scenario.relationship,
                selfStyle: state.assessment?.self,
                otherStyle: state.assessment?.other,
                language: lang,
            });
            setDialogue(result);
            dispatch({ type: 'SET_DIALOGUE', payload: result });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReflect = async (idx) => {
        if (!reflectionText.trim()) return;
        setReflectingIdx(idx);
        try {
            const feedback = await submitReflection({
                line: dialogue.lines[idx],
                reflection: reflectionText,
                language: lang,
            });
            setReflectionFeedback(prev => ({ ...prev, [idx]: feedback }));
            setReflections(prev => ({ ...prev, [idx]: reflectionText }));
            setReflectionText('');
        } catch (err) {
            setError(err.message);
        } finally {
            setReflectingIdx(null);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p className="loading-text">{td.loadingText}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--accent-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
                <button className="btn btn--primary" onClick={loadDialogue}>{td.retryBtn}</button>
            </div>
        );
    }

    if (!dialogue) return null;

    const highlightedIndices = dialogue.lines
        .map((l, i) => (l.pattern ? i : -1))
        .filter(i => i >= 0);
    const reflectedCount = Object.keys(reflections).length;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="section-title">{td.title}</h2>
            <p className="section-subtitle">{td.subtitle}</p>

            {dialogue.overallAnalysis && (
                <div className="glass-card--flat" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    <strong>{td.overallAnalysis}</strong> {dialogue.overallAnalysis}
                </div>
            )}

            <div className="chat-container">
                {dialogue.lines.map((line, idx) => {
                    const isSelf = line.speaker === state.scenario.selfName;
                    const hasPattern = !!line.pattern;
                    const isExpanded = expandedLine === idx;
                    const isReflected = reflections[idx];

                    return (
                        <motion.div key={idx}
                            className={`chat-bubble ${isSelf ? 'chat-bubble--self' : 'chat-bubble--other'} ${hasPattern ? 'chat-bubble--highlighted' : ''}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            onClick={() => hasPattern && setExpandedLine(isExpanded ? null : idx)}
                            style={hasPattern ? { cursor: 'pointer' } : undefined}
                        >
                            <div className="chat-bubble__speaker">{line.speaker}</div>
                            <p>{line.text}</p>

                            {hasPattern && (
                                <div className={`pattern-badge pattern-badge--${line.pattern}`}>
                                    <AlertTriangle size={12} />
                                    {td.patternLabels[line.pattern] || line.pattern}
                                </div>
                            )}

                            <AnimatePresence>
                                {isExpanded && hasPattern && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ marginTop: 'var(--space-4)', overflow: 'hidden' }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {line.explanation && (
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                                                {line.explanation}
                                            </p>
                                        )}

                                        {isReflected ? (
                                            <div>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent-success)' }}>{td.reflectionDone}</p>
                                                {reflectionFeedback[idx] && (
                                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                                                        {reflectionFeedback[idx].feedback}
                                                    </p>
                                                )}
                                                <button className="btn btn--ghost btn--small" style={{ marginTop: 'var(--space-2)' }}
                                                    onClick={() => { setReflections(prev => { const n = { ...prev }; delete n[idx]; return n; }); }}>
                                                    {td.reReflect}
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-accent)', marginBottom: 'var(--space-2)' }}>
                                                    {td.reflectionPrompt}
                                                </p>
                                                <textarea className="form-textarea" rows={3} placeholder={td.reflectionPlaceholder}
                                                    value={reflectionText}
                                                    onChange={e => setReflectionText(e.target.value)}
                                                    style={{ minHeight: 80 }} />
                                                <button className="btn btn--primary btn--small" style={{ marginTop: 'var(--space-2)' }}
                                                    onClick={() => handleReflect(idx)}
                                                    disabled={reflectingIdx === idx || !reflectionText.trim()}>
                                                    {reflectingIdx === idx ? <Loader2 size={14} className="spin" /> : '→'}
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            <div className="glass-card--flat" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    <strong>{td.tipTitle}</strong> {td.tipText}
                </p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-accent)', marginTop: 'var(--space-2)' }}>
                    {td.reflectedCount(reflectedCount, highlightedIndices.length)}
                </p>
            </div>

            <button className="btn btn--primary btn--large" style={{ width: '100%', marginTop: 'var(--space-6)' }}
                onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}>
                {td.nextStep}
            </button>
        </motion.div>
    );
}
