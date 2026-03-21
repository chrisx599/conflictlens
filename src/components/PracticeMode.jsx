import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, RotateCcw, MessageCircle, Edit3 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';
import { submitRewrite, getHint, sendRoleplayMessage, getRewriteSuggestion } from '../api/client';

export default function PracticeMode() {
    const { state, dispatch } = useApp();
    const { t, lang } = useLang();
    const tp = t.practice;

    const [mode, setMode] = useState('rewrite'); // 'rewrite' | 'roleplay'

    // Rewrite state
    const [currentIdx, setCurrentIdx] = useState(0);
    const [rewriteText, setRewriteText] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [hint, setHint] = useState(null);
    const [loadingRewrite, setLoadingRewrite] = useState(false);
    const [loadingHint, setLoadingHint] = useState(false);

    // Roleplay state
    const [roleplayInput, setRoleplayInput] = useState('');
    const [loadingRoleplay, setLoadingRoleplay] = useState(false);
    const [suggestion, setSuggestion] = useState(null);
    const [loadingSuggestion, setLoadingSuggestion] = useState(false);
    const chatEndRef = useRef(null);
    const debounceRef = useRef(null);

    const lines = state.dialogue?.lines || [];
    const negativeLines = lines.filter(l => l.pattern);
    const resetPoints = state.dialogue?.recommendedResetPoints || [];

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [state.roleplayHistory]);

    // Real-time suggestion debounce
    const handleRoleplayInputChange = useCallback((val) => {
        setRoleplayInput(val);
        setSuggestion(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (val.trim().length > 5) {
            debounceRef.current = setTimeout(async () => {
                setLoadingSuggestion(true);
                try {
                    const result = await getRewriteSuggestion({
                        draft: val,
                        context: state.roleplayHistory.slice(-4).map(m => `${m.speaker}: ${m.text}`).join('\n'),
                        language: lang,
                    });
                    setSuggestion(result);
                } catch (e) { /* ignore */ }
                setLoadingSuggestion(false);
            }, 1500);
        }
    }, [state.roleplayHistory, lang]);

    /* ── Rewrite Logic ── */
    const handleSubmitRewrite = async () => {
        if (!rewriteText.trim()) return;
        setLoadingRewrite(true);
        try {
            const line = negativeLines[currentIdx];
            const result = await submitRewrite({
                originalText: line.text,
                rewrittenText: rewriteText,
                pattern: line.pattern,
                speaker: line.speaker || '',
                language: lang,
            });
            setFeedback(result);
            dispatch({
                type: 'ADD_PRACTICE_ATTEMPT',
                payload: { original: line.text, pattern: line.pattern, rewrite: rewriteText, feedback: result },
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingRewrite(false);
        }
    };

    const handleGetHint = async () => {
        setLoadingHint(true);
        try {
            const line = negativeLines[currentIdx];
            const result = await getHint({
                originalText: line.text,
                pattern: line.pattern,
                language: lang,
            });
            setHint(result);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHint(false);
        }
    };

    const nextLine = () => {
        setCurrentIdx(c => Math.min(c + 1, negativeLines.length - 1));
        setRewriteText('');
        setFeedback(null);
        setHint(null);
    };

    /* ── Roleplay Logic ── */
    const handleSendRoleplay = async () => {
        if (!roleplayInput.trim() || loadingRoleplay) return;
        const userMsg = { speaker: state.scenario.selfName, text: roleplayInput, isUser: true };
        dispatch({ type: 'ADD_ROLEPLAY_MESSAGE', payload: userMsg });
        setRoleplayInput('');
        setSuggestion(null);
        setLoadingRoleplay(true);
        try {
            const result = await sendRoleplayMessage({
                scenario: state.scenario.description,
                selfName: state.scenario.selfName,
                otherName: state.scenario.otherName,
                otherStyle: state.assessment?.other,
                dialogueHistory: [...state.roleplayHistory, userMsg],
                userMessage: roleplayInput,
                language: lang,
            });
            dispatch({
                type: 'ADD_ROLEPLAY_MESSAGE',
                payload: {
                    speaker: state.scenario.otherName,
                    text: result.response,
                    emotion: result.emotion,
                    pattern: result.pattern,
                    openness: result.openness,
                    isUser: false,
                },
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingRoleplay(false);
        }
    };

    const handleResetFrom = (lineIdx) => {
        const context = lines.slice(0, lineIdx + 1).map(l => ({
            speaker: l.speaker, text: l.text, isUser: l.speaker === state.scenario.selfName,
        }));
        dispatch({ type: 'RESET_ROLEPLAY', payload: context });
    };

    const initRoleplay = () => {
        if (state.roleplayHistory.length === 0) {
            const context = lines.map(l => ({
                speaker: l.speaker, text: l.text, isUser: l.speaker === state.scenario.selfName,
            }));
            dispatch({ type: 'RESET_ROLEPLAY', payload: context });
        }
    };

    useEffect(() => {
        if (mode === 'roleplay') initRoleplay();
    }, [mode]);

    /* ── No patterns ── */
    if (negativeLines.length === 0 && mode === 'rewrite') {
        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                <p style={{ marginBottom: 'var(--space-4)' }}>{tp.noPatterns}</p>
                <button className="btn btn--primary" onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}>
                    {tp.skipToSummary}
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="section-title">{tp.title}</h2>
            <p className="section-subtitle">{tp.subtitle}</p>

            {/* Mode Toggle */}
            <div style={{
                display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)',
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-1)',
            }}>
                {['rewrite', 'roleplay'].map(m => (
                    <button key={m}
                        className={`btn ${mode === m ? 'btn--primary' : 'btn--ghost'}`}
                        style={{ flex: 1, gap: 'var(--space-2)' }}
                        onClick={() => setMode(m)}>
                        {m === 'rewrite' ? <Edit3 size={14} /> : <MessageCircle size={14} />}
                        {tp.modeToggle[m]}
                    </button>
                ))}
            </div>

            {/* ── Rewrite Mode ── */}
            {mode === 'rewrite' && negativeLines.length > 0 && (
                <>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                        {tp.progress(currentIdx + 1, negativeLines.length)}
                        {state.practiceAttempts.length > 0 && ` · ${tp.attemptsCount(state.practiceAttempts.length)}`}
                    </div>

                    <div className="glass-card--flat" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                        <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)',
                            fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-2)',
                        }}>
                            {t.dialogue.behaviorLabels[negativeLines[currentIdx].pattern] || negativeLines[currentIdx].pattern}
                        </span>
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{tp.originalLabel}</p>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 'var(--space-1)' }}>
                            "{negativeLines[currentIdx].text}"
                        </p>
                    </div>

                    {!feedback ? (
                        <>
                            <div className="form-group">
                                <label className="form-label">{tp.rewriteLabel}</label>
                                <textarea className="form-textarea" rows={3} placeholder={tp.rewritePlaceholder}
                                    value={rewriteText} onChange={e => setRewriteText(e.target.value)} />
                            </div>

                            {hint && (
                                <div className="glass-card--flat" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{tp.hintTitle}</p>
                                    {hint.focus && <p style={{ fontSize: 'var(--font-size-sm)' }}>{tp.hintFocus}{hint.focus}</p>}
                                    {hint.starter && <p style={{ fontSize: 'var(--font-size-sm)' }}>{tp.hintStarter(hint.starter)}</p>}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <button className="btn btn--secondary" onClick={handleGetHint} disabled={loadingHint}>
                                    {loadingHint ? <><Loader2 size={14} className="spin" /> {tp.hintLoading}</> : tp.hintBtn}
                                </button>
                                <button className="btn btn--primary" onClick={handleSubmitRewrite}
                                    disabled={!rewriteText.trim() || loadingRewrite}>
                                    {loadingRewrite ? <><Loader2 size={14} className="spin" /> {tp.analyzingBtn}</> : tp.submitBtn}
                                </button>
                            </div>
                        </>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {/* Score */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    background: 'var(--gradient-primary)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#fff',
                                }}>{feedback.score}</div>
                                <p style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{feedback.feedback}</p>
                            </div>

                            {/* NVC Check */}
                            {feedback.nvc && (
                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                    <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>{tp.nvcTitle}</p>
                                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                        {Object.entries(feedback.nvc).map(([k, v]) => (
                                            <span key={k} style={{
                                                padding: '4px 10px', borderRadius: '4px',
                                                background: v ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                                                color: v ? 'var(--accent-success)' : 'var(--text-tertiary)',
                                                fontSize: 'var(--font-size-xs)',
                                            }}>
                                                {v ? '✓' : '○'} {tp.nvcLabels[k]}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {feedback.suggestion && (
                                <div className="glass-card--flat" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{tp.suggestionLabel}</p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{feedback.suggestion}</p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <button className="btn btn--secondary" onClick={() => { setFeedback(null); setRewriteText(''); setHint(null); }}>
                                    {tp.retryBtn}
                                </button>
                                {currentIdx < negativeLines.length - 1 && (
                                    <button className="btn btn--primary" onClick={nextLine}>{tp.nextBtn}</button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </>
            )}

            {/* ── Roleplay Mode ── */}
            {mode === 'roleplay' && (
                <>
                    {/* Reset Points */}
                    {resetPoints.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
                                {tp.roleplay.resetPoints}:
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                {resetPoints.map(rp => (
                                    <button key={rp} className="btn btn--ghost" style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px' }}
                                        onClick={() => handleResetFrom(rp)}>
                                        <RotateCcw size={12} /> #{rp + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chat History */}
                    <div style={{
                        maxHeight: 400, overflowY: 'auto', marginBottom: 'var(--space-4)',
                        padding: 'var(--space-3)', background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                    }}>
                        {state.roleplayHistory.map((msg, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                flexDirection: msg.isUser ? 'row-reverse' : 'row',
                                gap: 'var(--space-2)', marginBottom: 'var(--space-2)',
                            }}>
                                <div style={{
                                    maxWidth: '70%',
                                    padding: 'var(--space-2) var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    background: msg.isUser ? 'rgba(124, 92, 252, 0.15)' : 'var(--bg-primary)',
                                    fontSize: 'var(--font-size-sm)',
                                }}>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                                        {msg.speaker}
                                        {msg.emotion && <span style={{ marginLeft: 8, fontSize: 'var(--font-size-xs)' }}>({msg.emotion})</span>}
                                    </p>
                                    <p style={{ lineHeight: 1.6 }}>{msg.text}</p>
                                    {msg.openness !== undefined && (
                                        <div style={{ marginTop: 4, fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            {tp.roleplay.openness}: {msg.openness}/10
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Real-time Suggestion */}
                    {(suggestion || loadingSuggestion) && (
                        <div className="glass-card--flat" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-accent)', marginBottom: 4 }}>
                                {tp.roleplay.suggestionTitle}
                            </p>
                            {loadingSuggestion ? (
                                <Loader2 size={12} className="spin" />
                            ) : suggestion?.hasIssue ? (
                                <>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{suggestion.suggestion}</p>
                                    {suggestion.tip && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>💡 {suggestion.tip}</p>}
                                </>
                            ) : (
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent-success)' }}>{tp.roleplay.noSuggestion}</p>
                            )}
                        </div>
                    )}

                    {/* Input */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input className="form-input" style={{ flex: 1 }}
                            placeholder={tp.roleplay.inputPlaceholder}
                            value={roleplayInput}
                            onChange={e => handleRoleplayInputChange(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendRoleplay()} />
                        <button className="btn btn--primary" onClick={handleSendRoleplay}
                            disabled={!roleplayInput.trim() || loadingRoleplay}>
                            {loadingRoleplay ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                        </button>
                    </div>
                </>
            )}

            {/* Generate Summary */}
            <div style={{ marginTop: 'var(--space-8)' }}>
                <button className="btn btn--primary btn--large" style={{ width: '100%' }}
                    onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}>
                    {tp.generateSummary}
                </button>
            </div>
        </motion.div>
    );
}
