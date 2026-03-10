import { Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LanguageContext';

const stepKeys = ['identify', 'reflect', 'practice', 'summary'];

export default function StepProgress() {
    const { state } = useApp();
    const { t } = useLang();
    const current = state.currentStep;

    return (
        <div className="step-progress">
            {stepKeys.map((key, i) => {
                const step = i + 1;
                const isActive = step === current;
                const isCompleted = step < current;

                return (
                    <div key={step} className="step-progress__item">
                        {i > 0 && (
                            <div
                                className={`step-progress__connector ${isCompleted || isActive ? 'step-progress__connector--active' : ''
                                    }`}
                            />
                        )}
                        <div
                            className={`step-progress__dot ${isActive
                                    ? 'step-progress__dot--active'
                                    : isCompleted
                                        ? 'step-progress__dot--completed'
                                        : 'step-progress__dot--pending'
                                }`}
                        >
                            {isCompleted ? <Check size={16} /> : step}
                        </div>
                        <span
                            className={`step-progress__label ${isActive ? 'step-progress__label--active' : ''
                                }`}
                        >
                            {t.steps[key]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
