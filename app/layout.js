export const metadata = {
  title: "Le Bref — Today's world, briefly",
  description:
    "A free, AI-powered daily news digest. The most important stories summarized into brief, categorized highlights with a permanent searchable archive.",
  metadataBase: new URL("https://lebref.news"),
  openGraph: {
    title: "Le Bref — Today's world, briefly",
    description:
      "The most important stories of the day, summarized into brief categorized highlights. Free forever.",
    url: "https://lebref.news",
    siteName: "Le Bref",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Le Bref — Today's world, briefly",
    description:
      "The most important stories of the day, summarized into brief categorized highlights.",
  },
  alternates: {
    types: {
      "application/rss+xml": "/api/rss",
    },
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F5" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1714" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="application/rss+xml" title="Le Bref" href="/api/rss" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
