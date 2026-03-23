"use client";

// ============================================
// Providers.js
// ============================================
// WHY THIS FILE EXISTS:
//   layout.js is a "server component" (runs on the server).
//   LangProvider uses useState/useEffect (needs the browser).
//   This file bridges the gap — it's a client component that
//   wraps your app in everything that needs the browser.
//
// If you add more providers later (theme, auth, etc.),
// stack them all in here so layout.js stays clean.
// ============================================

import { LangProvider } from "./LangContext";

export default function Providers({ children }) {
  return (
    <LangProvider>
      {children}
    </LangProvider>
  );
}
