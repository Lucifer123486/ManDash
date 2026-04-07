import { useLanguage } from '../../context/LanguageContext';

const LanguageSwitcher = () => {
    const { language, setLanguage } = useLanguage();

    const languages = [
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
        { code: 'mr', label: 'मराठी', flag: '🇮🇳' }
    ];

    return (
        <div className="language-switcher" style={{ display: 'flex', gap: '8px' }}>
            {languages.map(lang => (
                <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    style={{
                        padding: '4px 8px',
                        border: language === lang.code ? '1px solid #4CAF50' : '1px solid #ccc',
                        borderRadius: '4px',
                        background: language === lang.code ? '#e8f5e9' : 'white',
                        fontWeight: language === lang.code ? 'bold' : 'normal',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                    }}
                    title={lang.label}
                >
                    {lang.code.toUpperCase()}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
