import { createContext, useState, useContext, useEffect } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Default to stored language or English
    const [language, setLanguage] = useState(localStorage.getItem('appLanguage') || 'en');

    // Translation dictionary
    const translations = { en, hi, mr };

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
        // Can also set document direction here if needed (RTL)
    }, [language]);

    // Translation helper function
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            value = value?.[k];
            if (!value) return key; // Fallback to key if missing
        }

        return value || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
