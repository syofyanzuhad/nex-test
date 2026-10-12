import React, { createContext, useContext, useState } from "react";
import enData from "./en.json";
import thData from "./th.json";

export type Language = "en" | "th";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const dictionaries: Record<Language, Record<string, any>> = {
  en: enData,
  th: thData,
};

function getNestedValue(obj: Record<string, any>, keyPath: string): string | undefined {
  const parts = keyPath.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("app_lang");
    return (saved === "th" || saved === "en") ? saved : "en";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("app_lang", newLang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = dictionaries[lang] || dictionaries.en;
    let template = getNestedValue(dict, key);

    // Fallback to English if missing in current dictionary
    if (!template) {
      template = getNestedValue(dictionaries.en, key);
    }

    if (!template) {
      return key; // Fallback to raw key if not found in any dictionary
    }

    if (params) {
      for (const [pKey, pVal] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
      }
    }

    return template;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
