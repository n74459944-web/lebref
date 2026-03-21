"use client";

import { useState, useEffect, useRef } from "react";

// ============================================
// CONFIGURATION — reads from .env.local
// ============================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
// ============================================

const CATEGORIES = [
  { id: "all", label: "All", icon: "◉" },
  { id: "politics", label: "Politics", icon: "🏛", color: "#C62828" },
  { id: "economics", label: "Economics", icon: "📊", color: "#1565C0" },
  { id: "technology", label: "Technology", icon: "⚡", color: "#6A1B9A" },
  { id: "world", label: "World", icon: "🌍", color: "#2E7D32" },
  { id: "science", label: "Science", icon: "🔬", color: "#E65100" },
  { id: "health", label: "Health", icon: "🩺", color: "#00838F" },
  { id: "environment", label: "Climate", icon: "🌱", color: "#558B2F" },
  { id: "canada", label: "Canada", icon: "🍁", color: "#D32F2F" },
];

function getCatColor(id) {
  return CATEGORIES.find((c) => c.id === id)?.color || "#888";
}

function buildClaudeLink(article) {
  const prompt = `Explain this news story in depth. Cover the background, key players involved, what led to this, what happens next, and how it affects everyday people.\n\nHeadline: ${article.headline}\nSummary: ${article.summary}`;
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function getDateLabel(dateStr) {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const d = new Date(dateStr + "T12:00:00");
  const diff = Math.round((today - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function supabaseFetch(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

function formatSubcategory(sub) {
  if (!sub) return "";
  return sub.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LeBref() {
  const [articles, setArticles] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const searchRef = useRef(null);

  // Google Analytics
  useEffect(() => {
    if (!GA_ID) return;
    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s1);
    const s2 = document.createElement("script");
    s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`;
    document.head.appendChild(s2);
  }, []);

  // Load dates
  useEffect(() => {
    async function loadDates() {
      try {
        const rows = await supabaseFetch("articles", "select=published_date&order=published_date.desc&limit=500");
        const unique = [...new Set(rows.map((r) => r.published_date))].slice(0, 14);
        setAvailableDates(unique);
        if (unique.length > 0) setSelectedDate(unique[0]);
        else { setLoading(false); setError("No articles yet. Run digest_engine.py to generate your first digest."); }
      } catch (e) { setError("Could not connect to database. Check configuration."); setLoading(false); }
    }
    loadDates();
  }, []);

  // Load articles
  useEffect(() => {
    if (!selectedDate) return;
    async function loadArticles() {
      setLoading(true); setError(null);
      try {
        const rows = await supabaseFetch("articles",
          `published_date=eq.${selectedDate}&select=id,category,subcategory,headline,tldr,summary,why_it_matters,sources,source_urls,time_published&order=created_at.desc`
        );
        setArticles(rows);
      } catch (e) { setError("Failed to load articles."); }
      setLoading(false);
    }
    loadArticles();
  }, [selectedDate]);

  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);

  const filtered = articles.filter((a) => {
    const catMatch = selectedCategory === "all" || a.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const searchMatch = !q || a.headline.toLowerCase().includes(q) || a.tldr.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  const categoryCounts = {};
  articles.forEach((a) => { categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1; });

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email, subscribed_at: new Date().toISOString() }),
      });
      setSubscribed(true);
    } catch (err) {
      setSubscribed(true); // Show success anyway — worst case we collect later
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAF8F5", fontFamily: "'Instrument Serif', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .lb-header { background: #1A1714; color: #FAF8F5; padding: 18px 24px 14px; position: sticky; top: 0; z-index: 100; }
        .lb-masthead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .lb-title { font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; font-weight: 400; letter-spacing: -0.5px; line-height: 1; }
        .lb-title span { color: #D4A853; }
        .lb-sub { font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #8A847C; margin-top: 3px; }
        .lb-search-btn { background: none; border: 1px solid #3A3530; color: #8A847C; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; transition: all 0.2s; }
        .lb-search-btn:hover { border-color: #D4A853; color: #D4A853; }
        .lb-search-bar { width: 100%; padding: 9px 14px; background: #2A2520; border: 1px solid #3A3530; border-radius: 8px; color: #FAF8F5; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; margin-bottom: 10px; }
        .lb-search-bar:focus { border-color: #D4A853; }
        .lb-search-bar::placeholder { color: #5A554F; }

        .lb-dates { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
        .lb-date-chip { font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 5px 13px; border-radius: 20px; border: 1px solid #3A3530; background: transparent; color: #8A847C; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .lb-date-chip:hover { border-color: #5A554F; color: #C0BAB2; }
        .lb-date-chip.active { background: #D4A853; border-color: #D4A853; color: #1A1714; font-weight: 500; }

        .lb-cats { display: flex; gap: 4px; padding: 10px 24px; overflow-x: auto; background: #F3EFEA; border-bottom: 1px solid #E0DBD4; }
        .lb-cat { font-family: 'DM Sans', sans-serif; font-size: 11px; padding: 5px 10px; border-radius: 20px; border: 1px solid #D4CFC7; background: transparent; color: #6B665E; cursor: pointer; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
        .lb-cat:hover { border-color: #9A958E; }
        .lb-cat.active { background: #1A1714; border-color: #1A1714; color: #FAF8F5; }
        .lb-cat-n { font-size: 10px; background: rgba(0,0,0,0.08); padding: 1px 6px; border-radius: 10px; }
        .lb-cat.active .lb-cat-n { background: rgba(255,255,255,0.15); }

        .lb-content { max-width: 700px; margin: 0 auto; padding: 20px 20px 40px; }
        .lb-day-h { font-family: 'Instrument Serif', Georgia, serif; font-size: 20px; color: #1A1714; margin-bottom: 2px; }
        .lb-day-n { font-family: 'DM Sans', sans-serif; font-size: 12px; color: #9A958E; margin-bottom: 18px; }

        .lb-card { background: #FFFFFF; border: 1px solid #E8E4DE; border-radius: 10px; margin-bottom: 6px; position: relative; overflow: hidden; transition: all 0.25s ease; }
        .lb-card:hover { border-color: #CCC8C0; box-shadow: 0 2px 10px rgba(26,23,20,0.05); }
        .lb-card.expanded { border-color: #B0AAA2; box-shadow: 0 4px 20px rgba(26,23,20,0.08); margin-bottom: 12px; }
        .lb-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }

        .lb-tier1 { padding: 12px 14px 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; }
        .lb-tier1-left { flex: 1; min-width: 0; }
        .lb-tier1-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .lb-badge { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; padding: 2px 7px; border-radius: 3px; color: white; }
        .lb-sub-badge { font-family: 'DM Sans', sans-serif; font-size: 9px; padding: 2px 6px; border-radius: 3px; color: #8A847C; background: #F0ECE7; }
        .lb-time { font-family: 'DM Sans', sans-serif; font-size: 10px; color: #C0BAB2; }
        .lb-tldr { font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 400; line-height: 1.4; color: #2A2520; }
        .lb-chevron { font-size: 18px; color: #C0BAB2; flex-shrink: 0; transition: transform 0.25s, color 0.2s; user-select: none; }
        .lb-card.expanded .lb-chevron { transform: rotate(180deg); color: #D4A853; }

        .lb-tier2 { padding: 0 16px 14px; border-top: 1px solid #F0ECE7; }
        .lb-headline { font-family: 'Instrument Serif', Georgia, serif; font-size: 17px; line-height: 1.3; color: #1A1714; margin: 12px 0 8px; }
        .lb-summary { font-family: 'DM Sans', sans-serif; font-size: 13px; line-height: 1.65; color: #5A554F; margin-bottom: 10px; }
        .lb-wim { padding: 10px 12px; background: linear-gradient(135deg, #FDFAF3, #FBF6EA); border: 1px solid #EDE4CC; border-radius: 8px; margin-bottom: 10px; }
        .lb-wim-label { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #C09A3A; margin-bottom: 3px; }
        .lb-wim-text { font-family: 'DM Sans', sans-serif; font-size: 12.5px; line-height: 1.55; color: #5A4A2A; }
        .lb-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .lb-sources { font-family: 'DM Sans', sans-serif; font-size: 11px; color: #B0AAA2; }
        .lb-sources span { color: #9A958E; }
        .lb-deep { display: inline-flex; align-items: center; gap: 5px; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; color: #8B6914; text-decoration: none; padding: 5px 12px; border: 1px solid #D4A853; border-radius: 20px; background: linear-gradient(135deg, #FDF6E8, #FBF0D8); transition: all 0.2s; white-space: nowrap; }
        .lb-deep:hover { background: linear-gradient(135deg, #FBF0D8, #F5E6C0); transform: translateY(-1px); box-shadow: 0 2px 8px rgba(212,168,83,0.2); }

        .lb-newsletter { max-width: 700px; margin: 0 auto; padding: 0 20px 60px; }
        .lb-nl-box { background: #1A1714; border-radius: 12px; padding: 28px 24px; text-align: center; }
        .lb-nl-title { font-family: 'Instrument Serif', Georgia, serif; font-size: 22px; color: #FAF8F5; margin-bottom: 6px; }
        .lb-nl-desc { font-family: 'DM Sans', sans-serif; font-size: 13px; color: #8A847C; margin-bottom: 16px; }
        .lb-nl-form { display: flex; gap: 8px; max-width: 400px; margin: 0 auto; }
        .lb-nl-input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #3A3530; background: #2A2520; color: #FAF8F5; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; }
        .lb-nl-input:focus { border-color: #D4A853; }
        .lb-nl-input::placeholder { color: #5A554F; }
        .lb-nl-btn { padding: 10px 20px; border-radius: 8px; border: none; background: #D4A853; color: #1A1714; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .lb-nl-btn:hover { background: #E0B960; }
        .lb-nl-success { font-family: 'DM Sans', sans-serif; font-size: 14px; color: #D4A853; }

        .lb-state { text-align: center; padding: 50px 20px; font-family: 'DM Sans', sans-serif; }
        .lb-state-ico { font-size: 36px; margin-bottom: 10px; }
        .lb-state p { font-size: 14px; color: #9A958E; }
        .lb-state .error { color: #C62828; }
        .lb-loader { display: flex; justify-content: center; gap: 6px; padding: 60px 0; }
        .lb-dot { width: 8px; height: 8px; border-radius: 50%; background: #D4A853; animation: bounce 1.2s infinite; }
        .lb-dot:nth-child(2) { animation-delay: 0.15s; }
        .lb-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .lb-fade { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      {/* Header */}
      <header className="lb-header">
        <div className="lb-masthead">
          <div>
            <div className="lb-title">Le <span>Bref</span></div>
            <div className="lb-sub">Today's world, briefly</div>
          </div>
          <button className="lb-search-btn" onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}>
            {showSearch ? "✕" : "⌕"}
          </button>
        </div>
        {showSearch && (
          <input ref={searchRef} className="lb-search-bar" placeholder="Search highlights..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        )}
        <div className="lb-dates">
          {availableDates.slice(0, 7).map((d) => (
            <button key={d} className={`lb-date-chip ${selectedDate === d ? "active" : ""}`}
              onClick={() => { setSelectedDate(d); setExpandedId(null); setSelectedCategory("all"); }}>
              {getDateLabel(d)}
            </button>
          ))}
        </div>
      </header>

      {/* Categories */}
      <div className="lb-cats">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} className={`lb-cat ${selectedCategory === cat.id ? "active" : ""}`}
            onClick={() => { setSelectedCategory(cat.id); setExpandedId(null); }}>
            <span>{cat.icon}</span> {cat.label}
            {cat.id !== "all" && categoryCounts[cat.id] > 0 && (
              <span className="lb-cat-n">{categoryCounts[cat.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="lb-content">
        {error ? (
          <div className="lb-state"><div className="lb-state-ico">⚠️</div><p className="error">{error}</p></div>
        ) : loading ? (
          <div className="lb-loader"><div className="lb-dot" /><div className="lb-dot" /><div className="lb-dot" /></div>
        ) : (
          <>
            <h2 className="lb-day-h">{selectedDate && formatDate(selectedDate)}</h2>
            <p className="lb-day-n">
              {filtered.length} highlight{filtered.length !== 1 ? "s" : ""}
              {selectedCategory !== "all" && ` in ${CATEGORIES.find((c) => c.id === selectedCategory)?.label}`}
            </p>

            {filtered.length === 0 ? (
              <div className="lb-state"><div className="lb-state-ico">📭</div>
                <p>No highlights found{searchQuery ? " matching your search" : " for this category"}.</p>
              </div>
            ) : (
              filtered.map((article, i) => {
                const isExpanded = expandedId === article.id;
                const sources = Array.isArray(article.sources) ? article.sources : [];
                return (
                  <div key={article.id} className={`lb-card lb-fade ${isExpanded ? "expanded" : ""}`}
                    style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="lb-accent" style={{ background: getCatColor(article.category) }} />
                    <div className="lb-tier1" onClick={() => setExpandedId(isExpanded ? null : article.id)}>
                      <div className="lb-tier1-left">
                        <div className="lb-tier1-meta">
                          <span className="lb-badge" style={{ background: getCatColor(article.category) }}>{article.category}</span>
                          {article.subcategory && <span className="lb-sub-badge">{formatSubcategory(article.subcategory)}</span>}
                          {article.time_published && <span className="lb-time">{article.time_published}</span>}
                        </div>
                        <div className="lb-tldr">{article.tldr}</div>
                      </div>
                      <div className="lb-chevron">⌄</div>
                    </div>
                    {isExpanded && (
                      <div className="lb-tier2">
                        <div className="lb-headline">{article.headline}</div>
                        <div className="lb-summary">{article.summary}</div>
                        {article.why_it_matters && (
                          <div className="lb-wim">
                            <div className="lb-wim-label">✦ Why It Matters</div>
                            <div className="lb-wim-text">{article.why_it_matters}</div>
                          </div>
                        )}
                        <div className="lb-footer">
                          <div className="lb-sources">{sources.length > 0 && <>Sources: <span>{sources.join(" · ")}</span></>}</div>
                          <a href={buildClaudeLink(article)} target="_blank" rel="noopener noreferrer" className="lb-deep">✦ Go deeper with Claude →</a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Newsletter Signup */}
      <div className="lb-newsletter">
        <div className="lb-nl-box">
          <div className="lb-nl-title">Get Le Bref in your inbox</div>
          <div className="lb-nl-desc">The day's most important stories, delivered every morning. Free forever.</div>
          {subscribed ? (
            <div className="lb-nl-success">✓ You're in! Check your inbox tomorrow morning.</div>
          ) : (
            <div className="lb-nl-form">
              <input className="lb-nl-input" type="email" placeholder="your@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubscribe(e)} />
              <button className="lb-nl-btn" onClick={handleSubscribe}>Subscribe</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
