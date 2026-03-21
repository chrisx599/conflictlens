import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Download, Copy, Check, Printer, RefreshCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';
import { generateSummary } from '../api/client';

export default function SummaryReport() {
    const { state, dispatch } = useApp();
    const { t, lang } = useLang();
    const ts = t.summary;
    const assessment = state.assessment || state.conflictStyles;
    const practice = state.practice || { attempts: state.practiceAttempts || [] };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!state.summary) loadSummary();
    }, [state.summary]);

    async function loadSummary() {
        setLoading(true);
        setError(null);
        try {
            const result = await generateSummary({
                scenario: state.scenario,
                assessment,
                dialogue: state.dialogue,
                annotationResults: state.annotationResults,
                practice,
                roleplayHistory: state.roleplayHistory,
                language: lang,
            });
            dispatch({ type: 'SET_SUMMARY', payload: result });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleCopy = () => {
        const el = document.getElementById('summary-report-content');
        if (el) {
            navigator.clipboard.writeText(el.innerText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handlePrint = () => window.print();

    if (loading || !state.summary) {
        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                {error ? (
                    <>
                        <p style={{ color: 'var(--accent-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
                        <button className="btn btn--primary" onClick={loadSummary}>{ts.retryBtn}</button>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
                        <Loader2 size={20} className="spin" />
                        <span>{ts.loadingText}</span>
                    </div>
                )}
            </motion.div>
        );
    }

    const s = state.summary;

    return (
        <motion.div className="glass-card print-report" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="no-print" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', justifyContent: 'flex-end' }}>
                <button className="btn btn--ghost" onClick={handleCopy}>
                    {copied ? <><Check size={14} /> {ts.copiedBtn}</> : <><Copy size={14} /> {ts.copyBtn}</>}
                </button>
                <button className="btn btn--ghost" onClick={handlePrint}>
                    <Printer size={14} /> {ts.printBtn}
                </button>
                <button className="btn btn--secondary" onClick={handlePrint}>
                    <Download size={14} /> {ts.downloadPdf}
                </button>
            </div>

            <div id="summary-report-content">
                <h2 className="section-title">{ts.title}</h2>
                <p className="section-subtitle">{ts.subtitle}</p>

                {s.conflictProfile && (
                    <div className="glass-card--flat" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
                        <h3 style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-accent)', marginBottom: 'var(--space-3)' }}>
                            {s.conflictProfile.title}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            {s.conflictProfile.description}
                        </p>
                    </div>
                )}

                {s.patterns?.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ts.patternsTitle}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {s.patterns.map((p, i) => (
                                <div key={i} className="glass-card--flat" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: 'var(--font-size-xs)',
                                        background: p.frequency === 'high' ? 'rgba(239,68,68,0.1)' : p.frequency === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                                        color: p.frequency === 'high' ? 'var(--accent-danger)' : p.frequency === 'medium' ? 'var(--accent-warning)' : 'var(--accent-success)',
                                        alignSelf: 'flex-start',
                                        flexShrink: 0,
                                    }}>
                                        {ts.frequencyLabels[p.frequency] || p.frequency}
                                    </span>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{p.name}</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{p.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {s.annotationInsights && (
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ts.annotationTitle}</h3>
                        <div className="glass-card--flat" style={{ padding: 'var(--space-4)' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                                {s.annotationInsights.accuracy}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--accent-success)', marginBottom: 'var(--space-2)' }}>🎯</p>
                                    <ul style={{ fontSize: 'var(--font-size-sm)', paddingLeft: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                                        {(s.annotationInsights.strengths || []).map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--accent-warning)', marginBottom: 'var(--space-2)' }}>💡</p>
                                    <ul style={{ fontSize: 'var(--font-size-sm)', paddingLeft: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                                        {(s.annotationInsights.areasToImprove || []).map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {s.growthHighlights?.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ts.growthTitle}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {s.growthHighlights.map((g, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <span style={{ color: 'var(--accent-success)' }}>🌱</span>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{g}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {s.actionPlan?.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ts.actionTitle}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {s.actionPlan.map((a, i) => (
                                <div key={i} className="glass-card--flat" style={{ padding: 'var(--space-4)' }}>
                                    <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>
                                        🎯 {a.action}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                                        {a.detail}
                                    </p>
                                    {a.example && (
                                        <p style={{
                                            fontSize: 'var(--font-size-sm)',
                                            fontStyle: 'italic',
                                            color: 'var(--text-accent)',
                                            padding: 'var(--space-2) var(--space-3)',
                                            background: 'rgba(124, 92, 252, 0.06)',
                                            borderRadius: 'var(--radius-sm)',
                                        }}>
                                            "{a.example}"
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {s.toolkit?.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-2)' }}>{ts.toolkitTitle}</h3>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>{ts.toolkitHint}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            {s.toolkit.map((phrase, i) => (
                                <button key={i} className="btn btn--secondary" style={{ fontSize: 'var(--font-size-sm)' }}
                                    onClick={() => navigator.clipboard.writeText(phrase)}>
                                    {phrase}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {s.closingMessage && (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--space-6)',
                        background: 'linear-gradient(135deg, rgba(124, 92, 252, 0.08), rgba(168, 85, 247, 0.08))',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 'var(--space-6)',
                    }}>
                        <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-accent)', fontWeight: 500 }}>
                            {s.closingMessage}
                        </p>
                    </div>
                )}
            </div>

            <div className="no-print" style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <button className="btn btn--ghost" onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}>
                    {ts.backToPractice}
                </button>
                <button className="btn btn--primary" onClick={() => dispatch({ type: 'RESET' })}>
                    <RefreshCcw size={14} /> {ts.restart}
                </button>
            </div>
        </motion.div>
    );
}
