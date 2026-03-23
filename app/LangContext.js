"use client";

import { createContext, useContext, useState, useEffect } from "react";

// Create the context (the "wire" that connects everything)
var LangContext = createContext({ lang: "en", setLang: function () {} });

// Provider component — wrap your app in this
export function LangProvider({ children }) {
  // Check if user previously chose a language (saved in browser)
  var [lang, setLangState] = useState("en");

  // On first load, check localStorage for saved preference
  useEffect(function () {
    try {
      var saved = window.localStorage.getItem("lebref-lang");
      if (saved === "fr" || saved === "en") {
        setLangState(saved);
      } else {
        // Auto-detect: if browser language starts with "fr", default to French
        var browserLang = navigator.language || "";
        if (browserLang.toLowerCase().startsWith("fr")) {
          setLangState("fr");
        }
      }
    } catch (e) {
      // localStorage might be blocked — just use English
    }
  }, []);

  // When language changes, save to localStorage
  function setLang(newLang) {
    setLangState(newLang);
    try {
      window.localStorage.setItem("lebref-lang", newLang);
    } catch (e) {}
    // Update the <html> lang attribute for accessibility / SEO
    document.documentElement.lang = newLang;
  }

  return (
    <LangContext.Provider value={{ lang: lang, setLang: setLang }}>
      {children}
    </LangContext.Provider>
  );
}

// Hook — use this inside any component to get/set language
// Example:  var { lang, setLang } = useLang();
export function useLang() {
  return useContext(LangContext);
}

export default LangContext;
