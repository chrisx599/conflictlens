import { useLang } from '../context/LanguageContext';

export default function LanguageToggle() {
    const { lang, toggleLang } = useLang();

    return (
        <button
            className="lang-toggle"
            onClick={toggleLang}
            title={lang === 'zh' ? 'Switch to English' : '切换中文'}
        >
            <span className={`lang-toggle__option ${lang === 'zh' ? 'lang-toggle__option--active' : ''}`}>
                中
            </span>
            <span className="lang-toggle__divider">/</span>
            <span className={`lang-toggle__option ${lang === 'en' ? 'lang-toggle__option--active' : ''}`}>
                EN
            </span>
        </button>
    );
}
