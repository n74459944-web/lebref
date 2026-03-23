"use client";

import { useLang } from "./LangContext";

// A small toggle button: clicks swap between EN ↔ FR
export default function LangToggle() {
  var { lang, setLang } = useLang();

  function toggle() {
    setLang(lang === "en" ? "fr" : "en");
  }

  return (
    <button
      onClick={toggle}
      title={lang === "en" ? "Passer au français" : "Switch to English"}
      className="lb-sb"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.5px",
        minWidth: 36,
      }}
    >
      {lang === "en" ? "FR" : "EN"}
    </button>
  );
}
