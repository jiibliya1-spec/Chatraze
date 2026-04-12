import React, { createContext, useContext, useState, useCallback } from "react";
import { I18nManager } from "react-native";
import { Language, LANGUAGES, getLanguage, setLanguage, isRTL, t, TranslationKey } from "@/lib/i18n";

interface I18nContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>(getLanguage);

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    setLang(lang);
    const rtl = lang === "ar";
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
    }
  }, []);

  const translate = useCallback((key: TranslationKey) => t(key), [language]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t: translate, isRTL: isRTL() }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { LANGUAGES };
export type { Language };
