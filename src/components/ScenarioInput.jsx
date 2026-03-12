import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';
import { assessStyles } from '../api/client';

const STYLE_KEYS = ['competing', 'collaborating', 'compromising', 'avoiding', 'accommodating'];
const COLORS_SELF = ['#7c5cfc', '#a855f7', '#06b6d4', '#f59e0b', '#22c55e'];
const COLORS_OTHER = ['#5b3fd9', '#8b3fcf', '#0598b0', '#d98a09', '#1ba34e'];

export default function ScenarioInput() {
    const { state, dispatch } = useApp();
    const { t, lang } = useLang();
    const ts = t.scenario;
    const ta = t.assessment;

    const [phase, setPhase] = useState('input');
    const [scenario, setScenario] = useState({ selfName: '', otherName: '', relationship: '', description: '' });
    const [selfAnswers, setSelfAnswers] = useState([]);
    const [otherAnswers, setOtherAnswers] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isInputValid = scenario.selfName && scenario.otherName && scenario.relationship && scenario.description.length > 20;

    const handleSubmitScenario = () => {
        dispatch({ type: 'SET_SCENARIO', payload: scenario });
        setPhase('self-quiz');
        setCurrentQ(0);
    };

    const handleAnswer = (questionIdx, answerIdx, target) => {
        const setter = target === 'self' ? setSelfAnswers : setOtherAnswers;
        setter(prev => {
            const arr = [...prev];
            arr[questionIdx] = answerIdx;
            return arr;
        });
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
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

    const questions = phase === 'self-quiz' ? ta.selfQuestions : ta.otherQuestions;
    const answers = phase === 'self-quiz' ? selfAnswers : otherAnswers;
    const target = phase === 'self-quiz' ? 'self' : 'other';

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

    /* ── Quiz Phase ── */
    if (phase === 'self-quiz' || phase === 'other-quiz') {
        const q = questions[currentQ];
        const isLast = currentQ === questions.length - 1;
        const answered = answers[currentQ] !== undefined;

        return (
            <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="section-title">
                    {phase === 'self-quiz' ? ta.selfTitle : `${ta.otherTitlePrefix} ${scenario.otherName}`}
                </h2>
                <p className="section-subtitle">
                    {phase === 'self-quiz' ? ta.selfSubtitle : ta.otherSubtitle}
                </p>

                <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                    {currentQ + 1} / {questions.length}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={`${phase}-${currentQ}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>{q.question}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {q.options.map((opt, i) => (
                                <motion.button key={i}
                                    className={`btn ${answers[currentQ] === i ? 'btn--primary' : 'btn--secondary'}`}
                                    style={{ justifyContent: 'flex-start', textAlign: 'left', padding: 'var(--space-3) var(--space-4)', whiteSpace: 'normal' }}
                                    onClick={() => handleAnswer(currentQ, i, target)}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {opt}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-8)' }}>
                    <button className="btn btn--ghost"
                        onClick={() => currentQ > 0 ? setCurrentQ(c => c - 1) : setPhase('input')}>
                        {ta.prevBtn}
                    </button>

                    {answered && !isLast && (
                        <button className="btn btn--primary" onClick={() => setCurrentQ(c => c + 1)}>
                            {ta.nextQ}
                        </button>
                    )}

                    {answered && isLast && phase === 'self-quiz' && (
                        <button className="btn btn--primary" onClick={() => { setPhase('other-quiz'); setCurrentQ(0); }}>
                            {ta.continueOther}
                        </button>
                    )}

                    {answered && isLast && phase === 'other-quiz' && (
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
                                {ta.primaryStyle}: <strong style={{ color: 'var(--text-primary)' }}>{data.primaryStyle}</strong>
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

                <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>{ta.chartTitle}</h3>
                <div className="style-bars" style={{ marginBottom: 'var(--space-8)' }}>
                    {STYLE_KEYS.map((key, i) => (
                        <div key={key}>
                            <div className="style-bar">
                                <span className="style-bar__label">{ta.styleLabels[key]}</span>
                                <div className="style-bar__track">
                                    <motion.div className="style-bar__fill style-bar__fill--self"
                                        initial={{ width: 0 }} animate={{ width: `${(a.self.scores?.[key] || 0) * 10}%` }}
                                        transition={{ delay: i * 0.1, duration: 0.8 }}
                                        style={{ background: COLORS_SELF[i] }} />
                                </div>
                                <span className="style-bar__value">{a.self.scores?.[key] || 0}</span>
                            </div>
                            <div className="style-bar" style={{ marginTop: 4 }}>
                                <span className="style-bar__label" />
                                <div className="style-bar__track">
                                    <motion.div className="style-bar__fill style-bar__fill--other"
                                        initial={{ width: 0 }} animate={{ width: `${(a.other.scores?.[key] || 0) * 10}%` }}
                                        transition={{ delay: i * 0.1 + 0.05, duration: 0.8 }}
                                        style={{ background: COLORS_OTHER[i], opacity: 0.7 }} />
                                </div>
                                <span className="style-bar__value" style={{ opacity: 0.7 }}>{a.other.scores?.[key] || 0}</span>
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
