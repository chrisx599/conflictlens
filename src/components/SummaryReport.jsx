import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, Copy, Check, ArrowLeft, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';
import { generateSummary } from '../api/client';

export default function SummaryReport() {
    const { state, dispatch } = useApp();
    const { t, lang } = useLang();
    const ts = t.summary;

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [copiedPhrase, setCopiedPhrase] = useState(null);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await generateSummary({
                scenario: state.scenario,
                assessment: state.assessment,
                dialogue: state.dialogue,
                practice: state.practice,
                language: lang,
            });
            setReport(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        const text = `${ts.reportPrefix}\n\n` + JSON.stringify(report, null, 2);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => window.print();

    const handleCopyPhrase = async (phrase, idx) => {
        await navigator.clipboard.writeText(phrase);
        setCopiedPhrase(idx);
        setTimeout(() => setCopiedPhrase(null), 2000);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p className="loading-text">{ts.loadingText}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--accent-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
                <button className="btn btn--primary" onClick={loadSummary}>{ts.retryBtn}</button>
            </div>
        );
    }

    if (!report) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
                <div>
                    <h2 className="section-title">{ts.title}</h2>
                    <p className="section-subtitle" style={{ marginBottom: 0 }}>{ts.subtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn--secondary btn--small" onClick={handleCopy}>
                        {copied ? <><Check size={14} /> {ts.copiedBtn}</> : <><Copy size={14} /> {ts.copyBtn}</>}
                    </button>
                    <button className="btn btn--secondary btn--small" onClick={handlePrint}>
                        <Printer size={14} /> {ts.printBtn}
                    </button>
                </div>
            </div>

            <div className="glass-card">
                {/* Conflict Profile */}
                {report.conflictProfile && (
                    <div className="report-section">
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>
                            {report.conflictProfile.title || ts.title}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            {report.conflictProfile.description}
                        </p>
                    </div>
                )}

                {/* Patterns */}
                {report.patterns && report.patterns.length > 0 && (
                    <div className="report-section">
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ts.patternsTitle}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {report.patterns.map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) var(--space-4)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                                    <div>
                                        <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{p.name}</p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{p.description}</p>
                                    </div>
                                    {p.frequency && (
                                        <span className={`report-tag report-tag--${p.frequency}`}>
                                            {ts.frequencyLabels[p.frequency] || p.frequency}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Growth Highlights */}
                {report.growthHighlights && report.growthHighlights.length > 0 && (
                    <div className="report-section">
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ts.growthTitle}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {report.growthHighlights.map((g, i) => (
                                <p key={i} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', paddingLeft: 'var(--space-4)', borderLeft: '2px solid var(--accent-success)' }}>
                                    {g}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Plan */}
                {report.actionPlan && report.actionPlan.length > 0 && (
                    <div className="report-section">
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ts.actionTitle}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {report.actionPlan.map((a, i) => (
                                <div key={i}>
                                    <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{a.action}</p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{a.detail}</p>
                                    {a.example && (
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--accent-tertiary)', fontStyle: 'italic', marginTop: 'var(--space-1)' }}>
                                            &ldquo;{a.example}&rdquo;
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Toolkit */}
                {report.toolkit && report.toolkit.length > 0 && (
                    <div className="report-section">
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-2)' }}>{ts.toolkitTitle}</h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                            {ts.toolkitHint}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            {report.toolkit.map((phrase, i) => (
                                <button key={i}
                                    className="btn btn--secondary btn--small"
                                    onClick={() => handleCopyPhrase(phrase, i)}
                                    style={{ fontSize: 'var(--font-size-sm)' }}>
                                    {copiedPhrase === i ? <Check size={12} /> : null}
                                    {phrase}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-6)', justifyContent: 'center' }}>
                <button className="btn btn--secondary" onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}>
                    <ArrowLeft size={16} /> {ts.backToPractice}
                </button>
                <button className="btn btn--primary" onClick={() => dispatch({ type: 'RESET' })}>
                    <RotateCcw size={16} /> {ts.restart}
                </button>
            </div>
        </motion.div>
    );
}
