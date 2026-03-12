import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, Lightbulb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';
import { submitRewrite, getHint } from '../api/client';

export default function PracticeMode() {
    const { state, dispatch } = useApp();
    const { t, lang } = useLang();
    const tp = t.practice;

    const negativeLines = useMemo(() => {
        if (!state.dialogue?.lines) return [];
        return state.dialogue.lines.filter(l => l.pattern);
    }, [state.dialogue]);

    const [currentIdx, setCurrentIdx] = useState(0);
    const [rewriteText, setRewriteText] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hint, setHint] = useState(null);
    const [hintLoading, setHintLoading] = useState(false);
    const [attempts, setAttempts] = useState([]);

    if (negativeLines.length === 0) {
        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>{tp.noPatterns}</p>
                <button className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }}
                    onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}>
                    {tp.skipToSummary}
                </button>
            </div>
        );
    }

    const currentLine = negativeLines[currentIdx];

    const handleGetHint = async () => {
        setHintLoading(true);
        try {
            const result = await getHint({
                originalText: currentLine.text,
                pattern: currentLine.pattern,
                language: lang,
            });
            setHint(result);
        } catch (err) {
            /* ignore */
        } finally {
            setHintLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!rewriteText.trim()) return;
        setLoading(true);
        try {
            const result = await submitRewrite({
                originalText: currentLine.text,
                rewrittenText: rewriteText,
                pattern: currentLine.pattern,
                speaker: currentLine.speaker,
                language: lang,
            });
            const nextAttempts = [...attempts, { original: currentLine.text, rewrite: rewriteText, ...result }];
            setFeedback(result);
            setAttempts(nextAttempts);
            dispatch({ type: 'SET_PRACTICE', payload: { attempts: nextAttempts } });
        } catch (err) {
            setFeedback({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentIdx < negativeLines.length - 1) {
            setCurrentIdx(i => i + 1);
            setRewriteText('');
            setFeedback(null);
            setHint(null);
        }
    };

    const handleRetry = () => {
        setRewriteText('');
        setFeedback(null);
        setHint(null);
    };

    const nvcKeys = ['observation', 'feeling', 'need', 'request'];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="section-title">{tp.title}</h2>
            <p className="section-subtitle">{tp.subtitle}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                <span>{tp.progress(currentIdx + 1, negativeLines.length)}</span>
                {attempts.length > 0 && <span>{tp.attemptsCount(attempts.length)}</span>}
            </div>

            <div className="glass-card" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                        {tp.originalLabel}
                    </div>
                    <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--accent-danger)', lineHeight: 1.7 }}>
                        &ldquo;{currentLine.text}&rdquo;
                    </p>
                    <span className={`pattern-badge pattern-badge--${currentLine.pattern}`} style={{ marginTop: 'var(--space-2)' }}>
                        {t.dialogue.patternLabels[currentLine.pattern] || currentLine.pattern}
                    </span>
                </div>

                {!feedback && (
                    <>
                        <div className="form-group">
                            <label className="form-label">{tp.rewriteLabel}</label>
                            <textarea className="form-textarea" rows={4}
                                placeholder={tp.rewritePlaceholder}
                                value={rewriteText}
                                onChange={e => setRewriteText(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button className="btn btn--secondary btn--small" onClick={handleGetHint} disabled={hintLoading || !!hint}>
                                <Lightbulb size={14} />
                                {hintLoading ? tp.hintLoading : tp.hintBtn}
                            </button>
                            <button className="btn btn--primary" onClick={handleSubmit} disabled={loading || !rewriteText.trim()}>
                                {loading ? <><Loader2 size={16} className="spin" /> {tp.analyzingBtn}</> : tp.submitBtn}
                            </button>
                        </div>

                        {hint && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--accent-warning)' }}>{tp.hintTitle}</p>
                                {hint.focus && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>{tp.hintFocus}{hint.focus}</p>}
                                {hint.starter && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>{tp.hintStarter(hint.starter)}</p>}
                            </motion.div>
                        )}
                    </>
                )}

                {feedback && !feedback.error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                            <div className={`score-ring score-ring--${feedback.score >= 7 ? 'high' : feedback.score >= 4 ? 'mid' : 'low'}`}>
                                {feedback.score}
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{feedback.feedback}</p>
                                {feedback.encouragement && (
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>{feedback.encouragement}</p>
                                )}
                            </div>
                        </div>

                        {feedback.nvc && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{tp.nvcTitle}</p>
                                <div className="nvc-checklist">
                                    {nvcKeys.map(key => (
                                        <div key={key} className={`nvc-item ${feedback.nvc[key] ? 'nvc-item--pass' : 'nvc-item--fail'}`}>
                                            {feedback.nvc[key] ? <Check size={14} style={{ color: 'var(--accent-success)' }} /> : <X size={14} style={{ color: 'var(--accent-danger)' }} />}
                                            {tp.nvcLabels[key]}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {feedback.suggestion && (
                            <div style={{ padding: 'var(--space-3)', background: 'rgba(34, 197, 94, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--accent-success)' }}>{tp.suggestionLabel}</p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>&ldquo;{feedback.suggestion}&rdquo;</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                            <button className="btn btn--secondary" onClick={handleRetry}>{tp.retryBtn}</button>
                            {currentIdx < negativeLines.length - 1 ? (
                                <button className="btn btn--primary" onClick={handleNext}>{tp.nextBtn}</button>
                            ) : (
                                <button className="btn btn--primary" onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}>
                                    {tp.generateSummary}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {feedback?.error && (
                    <p style={{ color: 'var(--accent-danger)', marginTop: 'var(--space-4)' }}>{feedback.error}</p>
                )}
            </div>
        </motion.div>
    );
}
