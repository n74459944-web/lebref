// ============================================
// Le Bref — Translations (EN / FR)
// ============================================
// How this works:
//   t("tagline")  →  "Today's world, briefly"  (if lang is "en")
//   t("tagline")  →  "L'actualité mondiale, en bref"  (if lang is "fr")
//
// To add a new string: add a key here with both "en" and "fr" values,
// then use t("yourKey") anywhere in the UI.
// ============================================

var translations = {
  // Header
  tagline: {
    en: "Today's world, briefly",
    fr: "L'actualité mondiale, en bref",
  },
  searchPlaceholder: {
    en: "Search headlines...",
    fr: "Rechercher les titres...",
  },

  // Date labels
  today: { en: "Today", fr: "Aujourd'hui" },
  yesterday: { en: "Yesterday", fr: "Hier" },
  stories: { en: "stories", fr: "articles" },

  // Category filter
  all: { en: "All", fr: "Tout" },
  politics: { en: "Politics", fr: "Politique" },
  economics: { en: "Economics", fr: "Économie" },
  tech: { en: "Tech & Science", fr: "Techno & Sciences" },
  world: { en: "World", fr: "Monde" },
  health: { en: "Health", fr: "Santé" },
  crime: { en: "Crime & Justice", fr: "Crime & Justice" },
  breaking: { en: "Breaking", fr: "Urgent" },

  // Article cards
  whyItMatters: { en: "Why it matters", fr: "Pourquoi c'est important" },
  sources: { en: "Sources", fr: "Sources" },
  goDeeper: {
    en: "Go deeper with Claude",
    fr: "Approfondir avec Claude",
  },
  share: { en: "Share", fr: "Partager" },
  copied: { en: "Copied!", fr: "Copié !" },

  // What I'm watching section
  wimTitle: {
    en: "What I'm watching",
    fr: "Ce que je surveille",
  },
  wimSubtitle: {
    en: "Stories developing right now that could become tomorrow's headlines",
    fr: "Des histoires en développement qui pourraient faire les manchettes demain",
  },

  // Empty / error states
  noArticles: {
    en: "No articles yet. Run digest_engine.py to generate your first digest.",
    fr: "Aucun article. Exécutez digest_engine.py pour générer votre premier résumé.",
  },
  noResults: {
    en: "No articles match your search.",
    fr: "Aucun article ne correspond à votre recherche.",
  },
  dbError: {
    en: "Could not connect to database. Check configuration.",
    fr: "Impossible de se connecter à la base de données. Vérifiez la configuration.",
  },

  // Newsletter
  nlTitle: {
    en: "Get Le Bref in your inbox",
    fr: "Recevez Le Bref dans votre boîte courriel",
  },
  nlSubtitle: {
    en: "The day's most important stories, delivered every morning. Free forever.",
    fr: "Les nouvelles les plus importantes du jour, livrées chaque matin. Gratuit pour toujours.",
  },
  nlPlaceholder: {
    en: "your@email.com",
    fr: "votre@courriel.com",
  },
  nlButton: { en: "Subscribe", fr: "S'abonner" },
  nlThanks: {
    en: "You're in! First digest arrives tomorrow morning.",
    fr: "C'est fait ! Votre premier résumé arrive demain matin.",
  },

  // Footer
  footerTagline: {
    en: "Today's world, briefly.",
    fr: "L'actualité mondiale, en bref.",
  },
  footerPowered: {
    en: "AI-powered news digest",
    fr: "Résumé de nouvelles propulsé par l'IA",
  },
  footerRSS: { en: "RSS Feed", fr: "Flux RSS" },

  // Misc
  lightMode: { en: "Light mode", fr: "Mode clair" },
  darkMode: { en: "Dark mode", fr: "Mode sombre" },
  backToTop: { en: "Back to top", fr: "Retour en haut" },
  articleNotFound: {
    en: "Article not found.",
    fr: "Article introuvable.",
  },
  backToLeBref: {
    en: "Back to Le Bref",
    fr: "Retour à Le Bref",
  },
};

// ============================================
// The translate function
// Usage: t("tagline", "fr") → "L'actualité mondiale, en bref"
// ============================================
export function t(key, lang) {
  if (translations[key] && translations[key][lang]) {
    return translations[key][lang];
  }
  // Fallback: return the English version, or the key itself
  if (translations[key] && translations[key].en) {
    return translations[key].en;
  }
  return key;
}

export default translations;
