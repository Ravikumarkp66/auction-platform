"use client";

import React, { createContext, useContext, useState } from "react";
import { translations } from "../data/translations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState("en");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language");
      if (saved && ["en", "hi", "kn"].includes(saved)) {
        setLanguage(saved);
      }
    }
  }, []);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
  };

  const t = translations[language] || translations.en; // Fallback to English

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
