import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, RefreshCw, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';

const icons = [Sparkles, MessageSquare, RefreshCw, FileText];

export default function LandingHero() {
    const { dispatch } = useApp();
    const { t } = useLang();

    return (
        <motion.div
            className="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <motion.div
                className="hero__icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
                🔍
            </motion.div>

            <motion.h1
                className="hero__title"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                {t.appTitle}
            </motion.h1>

            <motion.p
                className="hero__subtitle"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                {t.hero.subtitle}
            </motion.p>

            <motion.div
                className="hero__features"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                {t.hero.features.map((label, i) => {
                    const Icon = icons[i];
                    return (
                        <div key={i} className="hero__feature">
                            <Icon size={24} style={{ color: 'var(--accent-primary)' }} />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                {label}
                            </span>
                        </div>
                    );
                })}
            </motion.div>

            <motion.button
                className="btn btn--primary btn--large"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {t.hero.cta}
            </motion.button>
        </motion.div>
    );
}
