export const metadata = {
  title: "Le Bref — Today's world, briefly",
  description:
    "A free, AI-powered daily news digest. The most important stories summarized into brief, categorized highlights with a permanent searchable archive.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
