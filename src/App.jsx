import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import LanguageToggle from './components/LanguageToggle';
import LandingHero from './components/LandingHero';
import StepProgress from './components/StepProgress';
import ScenarioInput from './components/ScenarioInput';
import ReflectiveDialogue from './components/ReflectiveDialogue';
import PracticeMode from './components/PracticeMode';
import SummaryReport from './components/SummaryReport';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

function StepRenderer() {
    const { state } = useApp();

    const components = {
        0: <LandingHero />,
        1: <ScenarioInput />,
        2: <ReflectiveDialogue />,
        3: <PracticeMode />,
        4: <SummaryReport />,
    };

    return (
        <div className="app-container">
            <div className="app-header">
                <LanguageToggle />
            </div>
            {state.currentStep > 0 && <StepProgress />}
            <div className="step-content">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={state.currentStep}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {components[state.currentStep] || <LandingHero />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <LanguageProvider>
            <AppProvider>
                <StepRenderer />
            </AppProvider>
        </LanguageProvider>
    );
}
