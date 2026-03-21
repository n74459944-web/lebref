"use client";

var CATEGORIES = [
  { id: "politics", color: "#C62828" },
  { id: "economics", color: "#1565C0" },
  { id: "tech", color: "#6A1B9A" },
  { id: "world", color: "#2E7D32" },
  { id: "health", color: "#00838F" },
  { id: "crime", color: "#4E342E" },
  { id: "breaking", color: "#B71C1C" },
];

function getCatColor(id) {
  var c = CATEGORIES.find(function(x) { return x.id === id; });
  return c ? c.color : "#888";
}

function fmtSub(s) { return s ? s.replace(/-/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); }) : ""; }

export default function ArticleView({ article, date }) {
  if (!article) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF8F5", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <p style={{ fontSize: 14, color: "#9A958E", marginBottom: 16 }}>Article not found.</p>
        <a href="/" style={{ color: "#D4A853", textDecoration: "none", fontWeight: 500 }}>Back to Le Bref</a>
      </div>
    );
  }

  var sources = Array.isArray(article.sources) ? article.sources : [];
  var claudeLink = "https://claude.ai/new?q=" + encodeURIComponent("Explain this news story in depth. Cover the background, key players involved, what led to this, what happens next, and how it affects everyday people.\n\nHeadline: " + article.headline + "\nSummary: " + article.summary);

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: article.headline, text: article.tldr, url: window.location.href }); } catch(e) {}
    } else {
      await navigator.clipboard.writeText(article.headline + "\n" + article.tldr + "\n\n" + window.location.href);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAF8F5", fontFamily: "'Instrument Serif', Georgia, serif" }}>
      <style dangerouslySetInnerHTML={{ __html: '@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap");' }} />

      <header style={{ background: "#1A1714", padding: "16px 24px" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 24, color: "#FAF8F5" }}>Le <span style={{ color: "#D4A853" }}>Bref</span></div>
        </a>
      </header>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
        <a href="/" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#9A958E", textDecoration: "none" }}>{"\u2190"} Back to today's digest</a>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 12 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", padding: "3px 8px", borderRadius: 3, color: "#fff", background: getCatColor(article.category) }}>{article.category}</span>
          {article.subcategory && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, padding: "3px 7px", borderRadius: 3, color: "#8A847C", background: "#F0ECE7" }}>{fmtSub(article.subcategory)}</span>}
          {article.time_published && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#B0AAA2" }}>{article.time_published} UTC</span>}
        </div>

        <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, lineHeight: 1.2, color: "#1A1714", marginBottom: 12 }}>{article.headline}</h1>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, lineHeight: 1.5, color: "#5A554F", marginBottom: 8, fontWeight: 500 }}>{article.tldr}</p>

        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#B0AAA2", marginBottom: 28 }}>{date}</p>

        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.75, color: "#3A3530", marginBottom: 24 }}>{article.summary}</div>

        {article.why_it_matters && (
          <div style={{ padding: "16px 18px", background: "linear-gradient(135deg, #FDFAF3, #FBF6EA)", border: "1px solid #EDE4CC", borderRadius: 10, marginBottom: 24 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "#C09A3A", marginBottom: 6 }}>{"\u2726"} Why It Matters</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.6, color: "#5A4A2A" }}>{article.why_it_matters}</div>
          </div>
        )}

        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#B0AAA2", marginBottom: 20 }}>
          {sources.length > 0 && <>Sources: <span style={{ color: "#9A958E" }}>{sources.join(" \u00B7 ")}</span></>}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={share} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "#6B665E", padding: "8px 18px", border: "1px solid #D4CFC7", borderRadius: 24, background: "#FAFAF8", cursor: "pointer" }}>Share this story</button>
          <a href={claudeLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "#8B6914", textDecoration: "none", padding: "8px 18px", border: "1px solid #D4A853", borderRadius: 24, background: "linear-gradient(135deg, #FDF6E8, #FBF0D8)" }}>{"\u2726"} Go deeper with Claude {"\u2192"}</a>
        </div>
      </div>
    </div>
  );
}
