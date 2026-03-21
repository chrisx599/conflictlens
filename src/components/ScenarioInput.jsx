import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Upload, X, Image } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';
import { assessStyles, uploadScreenshot, estimatePartnerAnswers } from '../api/client';

const SUBSCALE_KEYS = ['compromise', 'domination', 'submission', 'separation', 'avoidance', 'reactivity'];
const COLORS_SELF = ['#7c5cfc', '#f43f5e', '#06b6d4', '#f59e0b', '#a855f7', '#22c55e'];
const COLORS_OTHER = ['#5b3fd9', '#c1293f', '#0598b0', '#d98a09', '#8b3fcf', '#1ba34e'];

export default function ScenarioInput() {
    const { state, dispatch } = useApp();
    const { t, lang } = useLang();
    const ts = t.scenario;
    const ta = t.assessment;

    const [phase, setPhase] = useState('input');
    const [scenario, setScenario] = useState({ selfName: '', otherName: '', relationship: '', description: '' });
    const [selfAnswers, setSelfAnswers] = useState(Array(13).fill(3));
    const [otherAnswers, setOtherAnswers] = useState(Array(13).fill(3));
    const [currentQ, setCurrentQ] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Screenshot
    const fileInput = useRef(null);
    const [screenshotFile, setScreenshotFile] = useState(null);
    const [screenshotStatus, setScreenshotStatus] = useState(null); // null | 'uploading' | 'success' | 'error'
    const [screenshotPreview, setScreenshotPreview] = useState(null);

    const isInputValid = scenario.selfName && scenario.otherName && scenario.relationship && scenario.description.length > 20;

    /* ── Screenshot Handling ── */
    const handleScreenshotSelect = async (file) => {
        if (!file) return;
        setScreenshotFile(file);
        setScreenshotPreview(URL.createObjectURL(file));
        setScreenshotStatus('uploading');
        try {
            const result = await uploadScreenshot(file);
            dispatch({ type: 'SET_SCREENSHOT_DATA', payload: result });
            if (result.raw_text) {
                setScenario(s => ({ ...s, description: s.description ? s.description + '\n\n--- 截图内容 ---\n' + result.raw_text : result.raw_text }));
            }
            setScreenshotStatus('success');
        } catch (err) {
            console.error('Screenshot upload failed:', err);
            setScreenshotStatus('error');
        }
    };

    const removeScreenshot = () => {
        setScreenshotFile(null);
        setScreenshotPreview(null);
        setScreenshotStatus(null);
        if (fileInput.current) fileInput.current.value = '';
    };

    /* ── Phase Transitions ── */
    const handleSubmitScenario = () => {
        dispatch({ type: 'SET_SCENARIO', payload: scenario });
        setPhase('self-quiz');
        setCurrentQ(0);
    };

    const handleFinishSelfQuiz = async () => {
        dispatch({ type: 'SET_SELF_ANSWERS', payload: selfAnswers });
        setLoading(true);
        setError(null);
        try {
            const result = await estimatePartnerAnswers({
                scenario: scenario.description,
                selfName: scenario.selfName,
                otherName: scenario.otherName,
                relationship: scenario.relationship,
                selfAnswers,
                language: lang,
            });
            if (result.estimatedAnswers) {
                setOtherAnswers(result.estimatedAnswers);
            }
            setPhase('other-quiz');
            setCurrentQ(0);
        } catch (err) {
            console.error('Partner estimation failed:', err);
            setPhase('other-quiz');
            setCurrentQ(0);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        dispatch({ type: 'SET_OTHER_ANSWERS', payload: otherAnswers });
        try {
            const result = await assessStyles({
                scenario: scenario.description,
                selfName: scenario.selfName,
                otherName: scenario.otherName,
                relationship: scenario.relationship,
                selfAnswers,
                otherAnswers,
                language: lang,
            });
            dispatch({ type: 'SET_ASSESSMENT', payload: result });
            setPhase('results');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLikertChange = (idx, value, target) => {
        const setter = target === 'self' ? setSelfAnswers : setOtherAnswers;
        setter(prev => {
            const arr = [...prev];
            arr[idx] = value;
            return arr;
        });
    };

    /* ── Input Phase ── */
    if (phase === 'input') {
        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="section-title">{ts.title}</h2>
                <p className="section-subtitle">{ts.subtitle}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div className="form-group">
                        <label className="form-label">{ts.selfNameLabel}</label>
                        <input className="form-input" placeholder={ts.selfNamePlaceholder}
                            value={scenario.selfName} onChange={e => setScenario(s => ({ ...s, selfName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{ts.otherNameLabel}</label>
                        <input className="form-input" placeholder={ts.otherNamePlaceholder}
                            value={scenario.otherName} onChange={e => setScenario(s => ({ ...s, otherName: e.target.value }))} />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">{ts.relationshipLabel}</label>
                    <select className="form-select" value={scenario.relationship}
                        onChange={e => setScenario(s => ({ ...s, relationship: e.target.value }))}>
                        <option value="">{ts.relationshipPlaceholder}</option>
                        {Object.entries(ts.relationshipTypes).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                </div>

                {/* Screenshot Upload */}
                <div className="form-group">
                    <label className="form-label">{ts.screenshotTitle}</label>
                    <div className="screenshot-zone" onClick={() => !screenshotFile && fileInput.current?.click()}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={e => { e.preventDefault(); e.stopPropagation(); handleScreenshotSelect(e.dataTransfer.files[0]); }}
                        style={{
                            border: '2px dashed var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-6)',
                            textAlign: 'center',
                            cursor: screenshotFile ? 'default' : 'pointer',
                            background: 'var(--bg-secondary)',
                            transition: 'all 0.2s',
                            position: 'relative',
                        }}>
                        <input ref={fileInput} type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => handleScreenshotSelect(e.target.files[0])} />

                        {!screenshotFile ? (
                            <div style={{ color: 'var(--text-tertiary)' }}>
                                <Upload size={24} style={{ marginBottom: 8 }} />
                                <p>{ts.screenshotHint}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                {screenshotPreview && (
                                    <img src={screenshotPreview} alt="screenshot" style={{
                                        maxHeight: 80, borderRadius: 'var(--radius-md)',
                                        objectFit: 'contain', flexShrink: 0,
                                    }} />
                                )}
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    {screenshotStatus === 'uploading' && (
                                        <span style={{ color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Loader2 size={14} className="spin" /> {ts.screenshotUploading}
                                        </span>
                                    )}
                                    {screenshotStatus === 'success' && (
                                        <span style={{ color: 'var(--accent-success)' }}>{ts.screenshotSuccess}</span>
                                    )}
                                    {screenshotStatus === 'error' && (
                                        <span style={{ color: 'var(--accent-danger)' }}>{ts.screenshotError}</span>
                                    )}
                                </div>
                                <button className="btn btn--ghost" onClick={(e) => { e.stopPropagation(); removeScreenshot(); }}
                                    style={{ padding: 'var(--space-1)', flexShrink: 0 }}>
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">{ts.descriptionLabel}</label>
                    <textarea className="form-textarea" rows={6} placeholder={ts.descriptionPlaceholder}
                        value={scenario.description} onChange={e => setScenario(s => ({ ...s, description: e.target.value }))} />
                </div>

                <button className="btn btn--primary btn--large" disabled={!isInputValid} onClick={handleSubmitScenario}>
                    {ts.nextBtn}
                </button>
            </motion.div>
        );
    }

    /* ── Likert Quiz Phase ── */
    if (phase === 'self-quiz' || phase === 'other-quiz') {
        const questions = phase === 'self-quiz' ? ta.selfQuestions : ta.otherQuestions;
        const answers = phase === 'self-quiz' ? selfAnswers : otherAnswers;
        const target = phase === 'self-quiz' ? 'self' : 'other';
        const q = questions[currentQ];
        const isLast = currentQ === questions.length - 1;

        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="section-title">
                    {phase === 'self-quiz' ? ta.selfTitle : `${ta.otherTitlePrefix} ${scenario.otherName}`}
                </h2>
                <p className="section-subtitle">
                    {phase === 'self-quiz' ? ta.selfSubtitle : ta.otherSubtitle}
                </p>

                {phase === 'other-quiz' && (
                    <div style={{
                        background: 'var(--bg-tertiary)', padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
                        fontSize: 'var(--font-size-sm)', color: 'var(--text-accent)',
                    }}>
                        💡 {ta.adjustHint}
                    </div>
                )}

                <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                    {currentQ + 1} / {questions.length}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={`${phase}-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-6)', lineHeight: 1.7 }}>
                            {q}
                        </h3>

                        {/* Likert Scale */}
                        <div style={{ padding: '0 var(--space-4)' }}>
                            <input
                                type="range" min={1} max={5} step={1}
                                value={answers[currentQ]}
                                onChange={e => handleLikertChange(currentQ, parseInt(e.target.value), target)}
                                style={{ width: '100%', accentColor: 'var(--text-accent)' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                                {ta.likertLabels.map((label, i) => (
                                    <span key={i} style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: answers[currentQ] === i + 1 ? 'var(--text-accent)' : 'var(--text-tertiary)',
                                        fontWeight: answers[currentQ] === i + 1 ? 600 : 400,
                                        textAlign: 'center',
                                        flex: 1,
                                        transition: 'all 0.2s',
                                    }}>
                                        {label}
                                    </span>
                                ))}
                            </div>
                            <div style={{
                                textAlign: 'center', marginTop: 'var(--space-4)',
                                fontSize: 'var(--font-size-2xl)', fontWeight: 700,
                                color: 'var(--text-accent)',
                            }}>
                                {answers[currentQ]}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-8)' }}>
                    <button className="btn btn--ghost"
                        onClick={() => currentQ > 0 ? setCurrentQ(c => c - 1) : setPhase(phase === 'self-quiz' ? 'input' : 'self-quiz')}>
                        {ta.prevBtn}
                    </button>

                    {!isLast && (
                        <button className="btn btn--primary" onClick={() => setCurrentQ(c => c + 1)}>
                            {ta.nextQ}
                        </button>
                    )}

                    {isLast && phase === 'self-quiz' && (
                        <button className="btn btn--primary" onClick={handleFinishSelfQuiz} disabled={loading}>
                            {loading ? <><Loader2 size={16} className="spin" /> {ta.estimatingText}</> : ta.continueOther}
                        </button>
                    )}

                    {isLast && phase === 'other-quiz' && (
                        <button className="btn btn--primary" onClick={handleAnalyze} disabled={loading}>
                            {loading ? <><Loader2 size={16} className="spin" /> {ta.analyzingText}</> : ta.analyzeBtn}
                        </button>
                    )}
                </div>

                {error && <p style={{ color: 'var(--accent-danger)', marginTop: 'var(--space-4)' }}>{error}</p>}
            </motion.div>
        );
    }

    /* ── Results Phase ── */
    if (phase === 'results') {
        const a = state.assessment || state.conflictStyles;

        if (!a?.self || !a?.other) {
            return (
                <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p style={{ color: 'var(--accent-danger)', marginBottom: 'var(--space-4)' }}>
                        {error || 'Assessment result is incomplete.'}
                    </p>
                    <button className="btn btn--primary" onClick={() => setPhase('other-quiz')}>
                        {ta.retryBtn || ta.prevBtn}
                    </button>
                </motion.div>
            );
        }

        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="section-title">{ta.resultsTitle}</h2>

                {a.dynamicAnalysis && (
                    <div className="glass-card--flat" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {a.dynamicAnalysis}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
                    {[{ data: a.self, name: scenario.selfName }, { data: a.other, name: scenario.otherName }].map(({ data, name }) => (
                        <div key={name} className="glass-card--flat" style={{ padding: 'var(--space-6)' }}>
                            <h3 style={{ color: 'var(--text-accent)', marginBottom: 'var(--space-2)' }}>{name}</h3>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                                {ta.primaryStyle}: <strong style={{ color: 'var(--text-primary)' }}>
                                    {ta.styleLabels[data.primaryStyle?.toLowerCase()] || data.primaryStyle}
                                </strong>
                            </p>
                            <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                                {data.description}
                            </p>
                            <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>
                                <span style={{ color: 'var(--accent-success)' }}>✦ {ta.strengths}:</span>{' '}
                                <span style={{ color: 'var(--text-secondary)' }}>{data.strengths}</span>
                            </p>
                            <p style={{ fontSize: 'var(--font-size-sm)' }}>
                                <span style={{ color: 'var(--accent-warning)' }}>⚠ {ta.blindspots}:</span>{' '}
                                <span style={{ color: 'var(--text-secondary)' }}>{data.blindspots}</span>
                            </p>
                            {data.description && (
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-4)' }}>
                                    {data.description}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Dynamic Analysis */}
                {a.dynamicAnalysis && (
                    <div className="glass-card--flat" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            🔍 {a.dynamicAnalysis}
                        </p>
                    </div>
                )}

                {/* Subscale Bar Chart */}
                <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ta.chartTitle}</h3>
                <div className="style-bars" style={{ marginBottom: 'var(--space-8)' }}>
                    {SUBSCALE_KEYS.map((key, i) => (
                        <div key={key}>
                            <div className="style-bar">
                                <span className="style-bar__label">{ta.subscaleLabels[key]}</span>
                                <div className="style-bar__track">
                                    <motion.div className="style-bar__fill style-bar__fill--self"
                                        initial={{ width: 0 }} animate={{ width: `${(a.self?.scores?.[key] || 0) * 10}%` }}
                                        transition={{ delay: i * 0.1, duration: 0.8 }}
                                        style={{ background: COLORS_SELF[i] }} />
                                </div>
                                <span className="style-bar__value">{a.self?.scores?.[key] || 0}</span>
                            </div>
                            <div className="style-bar" style={{ marginTop: 4 }}>
                                <span className="style-bar__label" />
                                <div className="style-bar__track">
                                    <motion.div className="style-bar__fill style-bar__fill--other"
                                        initial={{ width: 0 }} animate={{ width: `${(a.other?.scores?.[key] || 0) * 10}%` }}
                                        transition={{ delay: i * 0.1 + 0.05, duration: 0.8 }}
                                        style={{ background: COLORS_OTHER[i], opacity: 0.7 }} />
                                </div>
                                <span className="style-bar__value" style={{ opacity: 0.7 }}>{a.other?.scores?.[key] || 0}</span>
                            </div>
                        </div>
                    ))}
                    <div style={{ display: 'flex', gap: 'var(--space-6)', justifyContent: 'center', marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                        <span>● {scenario.selfName}</span>
                        <span style={{ opacity: 0.7 }}>● {scenario.otherName}</span>
                    </div>
                </div>

                <button className="btn btn--primary btn--large" style={{ width: '100%' }}
                    onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}>
                    {ta.nextStep}
                </button>
            </motion.div>
        );
    }

    return null;
}
