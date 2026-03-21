"use client";

import { useState, useEffect, useRef, useCallback } from "react";

var SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
var SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

var CATS = [
  { id: "all", label: "All", icon: "\u25C9" },
  { id: "breaking", label: "Breaking", icon: "\uD83D\uDD34", color: "#B71C1C", isLive: true },
  { id: "politics", label: "Politics", icon: "\uD83C\uDFDB\uFE0F", color: "#C62828" },
  { id: "economics", label: "Economics", icon: "\uD83D\uDCCA", color: "#1565C0" },
  { id: "tech", label: "Tech & Science", icon: "\u26A1", color: "#6A1B9A" },
  { id: "world", label: "World", icon: "\uD83C\uDF0D", color: "#2E7D32" },
  { id: "health", label: "Health", icon: "\uD83E\uDE7A", color: "#00838F" },
  { id: "crime", label: "Crime & Justice", icon: "\u2696\uFE0F", color: "#4E342E" },
];

function catCol(id) { var c = CATS.find(function(x) { return x.id === id; }); return c ? c.color || "#888" : "#888"; }
function claudeUrl(a) { return "https://claude.ai/new?q=" + encodeURIComponent("Explain this news story in depth. Cover the background, key players, what led to this, what happens next, and how it affects everyday people.\n\nHeadline: " + a.headline + "\nSummary: " + a.summary); }
function slug(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }
function aLink(a) { return "/article/" + (a.published_date || "") + "/" + slug(a.headline); }
function fmtDate(ds) { return new Date(ds + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
function fmtSub(s) { return s ? s.replace(/-/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); }) : ""; }

function dateLabel(ds) {
  var today = new Date(); today.setHours(12, 0, 0, 0);
  var diff = Math.round((today - new Date(ds + "T12:00:00")) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(ds + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(isoStr) {
  if (!isoStr) return "";
  var diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return diff + "m ago";
  if (diff < 1440) return Math.floor(diff / 60) + "h ago";
  return Math.floor(diff / 1440) + "d ago";
}

async function sbClient(table, params) {
  var r = await fetch(SB_URL + "/rest/v1/" + table + "?" + (params || ""), {
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }
  });
  if (!r.ok) throw new Error("DB error");
  return r.json();
}

async function doShare(a, e) {
  e.stopPropagation();
  var url = (typeof window !== "undefined" ? window.location.origin : "") + aLink(a);
  if (typeof navigator !== "undefined" && navigator.share) {
    try { await navigator.share({ title: a.headline, text: a.tldr, url: url }); } catch(x) {}
  } else if (typeof navigator !== "undefined") {
    await navigator.clipboard.writeText(a.headline + "\n" + a.tldr + "\n\n" + url);
    var b = e.currentTarget, o = b.textContent; b.textContent = "Copied!";
    setTimeout(function() { b.textContent = o; }, 1500);
  }
}

function Skeleton() {
  return <div className="lb-sk"><div className="lb-sk-badge" /><div className="lb-sk-line lb-sk-l1" /><div className="lb-sk-line lb-sk-l2" /></div>;
}

function InlineNL() {
  var [em, setEm] = useState("");
  var [done, setDone] = useState(false);
  async function sub(e) {
    e.preventDefault();
    if (!em || em.indexOf("@") < 0) return;
    try { await fetch(SB_URL + "/rest/v1/subscribers", { method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ email: em, subscribed_at: new Date().toISOString() }) }); } catch(x) {}
    setDone(true);
  }
  if (done) return <div className="lb-inl"><div className="lb-inl-ok">{"\u2713"} You're in! See you tomorrow.</div></div>;
  return (
    <div className="lb-inl">
      <div className="lb-inl-t">Get tomorrow's digest in your inbox {"\u2192"}</div>
      <div className="lb-inl-f">
        <input className="lb-inl-i" type="email" placeholder="your@email.com" value={em} onChange={function(e) { setEm(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") sub(e); }} />
        <button className="lb-inl-b" onClick={sub}>Subscribe</button>
      </div>
    </div>
  );
}

export default function LeBref({ initialDates, initialDateCounts, initialArticles, initialError }) {
  // Use SSG data for initial render
  var firstDate = initialDates && initialDates.length > 0 ? initialDates[0] : null;

  var [articles, setArticles] = useState(firstDate && initialArticles[firstDate] ? initialArticles[firstDate] : []);
  var [dateCounts, setDateCounts] = useState(initialDateCounts || {});
  var [dates, setDates] = useState(initialDates || []);
  var [selDate, setSelDate] = useState(firstDate);
  var [selCat, setSelCat] = useState("all");
  var [expId, setExpId] = useState(null);
  var [query, setQuery] = useState("");
  var [search, setSearch] = useState(false);
  var [loading, setLoading] = useState(false); // No loading on first render — data is pre-fetched
  var [err, setErr] = useState(initialError);
  var [email, setEmail] = useState("");
  var [subbed, setSubbed] = useState(false);
  var [dark, setDark] = useState(false);
  var [showTop, setShowTop] = useState(false);
  var [lastUpdated, setLastUpdated] = useState(articles.length > 0 ? articles[0].created_at : null);
  var [updatedText, setUpdatedText] = useState("");
  var [fetchedDates, setFetchedDates] = useState(firstDate ? { [firstDate]: true } : {});
  var sRef = useRef(null);

  // Tick the "Updated X ago" every 60s client-side
  useEffect(function() {
    function tick() { if (lastUpdated) setUpdatedText(timeAgo(lastUpdated)); }
    tick();
    var iv = setInterval(tick, 60000);
    return function() { clearInterval(iv); };
  }, [lastUpdated]);

  function toggleDark() { var n = !dark; setDark(n); try { localStorage.setItem("lb-dark", n ? "1" : "0"); } catch(e) {} }

  useEffect(function() {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) setDark(true);
      var saved = localStorage.getItem("lb-dark");
      if (saved !== null) setDark(saved === "1");
    } catch(e) {}
  }, []);

  useEffect(function() {
    if (!GA_ID) return;
    var s1 = document.createElement("script"); s1.async = true;
    s1.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s1);
    var s2 = document.createElement("script");
    s2.textContent = "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','" + GA_ID + "');";
    document.head.appendChild(s2);
  }, []);

  useEffect(function() {
    function onScroll() { setShowTop(window.scrollY > 400); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return function() { window.removeEventListener("scroll", onScroll); };
  }, []);

  var handleKey = useCallback(function(e) {
    if (search || e.target.tagName === "INPUT") return;
    if (e.key === "Escape" && expId) setExpId(null);
  }, [search, expId]);
  useEffect(function() { window.addEventListener("keydown", handleKey); return function() { window.removeEventListener("keydown", handleKey); }; }, [handleKey]);

  // Only fetch client-side when user switches to a date we don't have yet
  useEffect(function() {
    if (!selDate) return;

    // Already have this date's articles from SSG or previous fetch
    if (initialArticles[selDate] && !fetchedDates[selDate]) {
      setArticles(initialArticles[selDate]);
      if (initialArticles[selDate].length > 0) setLastUpdated(initialArticles[selDate][0].created_at);
      setFetchedDates(function(prev) { var n = Object.assign({}, prev); n[selDate] = true; return n; });
      return;
    }

    if (fetchedDates[selDate]) return;

    // Fetch from client
    (async function() {
      setLoading(true); setErr(null);
      try {
        var rows = await sbClient("articles", "published_date=eq." + selDate + "&select=id,category,subcategory,headline,tldr,summary,why_it_matters,sources,source_urls,time_published,published_date,created_at&order=time_published.desc");
        setArticles(rows);
        if (rows.length > 0) setLastUpdated(rows[0].created_at);
        setFetchedDates(function(prev) { var n = Object.assign({}, prev); n[selDate] = true; return n; });
      } catch(e) { setErr("Failed to load."); }
      setLoading(false);
    })();
  }, [selDate]);

  useEffect(function() { if (search && sRef.current) sRef.current.focus(); }, [search]);

  var filtered = articles.filter(function(a) {
    var cm = selCat === "all" || a.category === selCat;
    var q = query.toLowerCase();
    var sm = !q || a.headline.toLowerCase().indexOf(q) >= 0 || a.tldr.toLowerCase().indexOf(q) >= 0;
    return cm && sm;
  });

  var cc = {};
  articles.forEach(function(a) { cc[a.category] = (cc[a.category] || 0) + 1; });
  var hasBrk = cc["breaking"] > 0;

  var subCounts = {};
  articles.forEach(function(a) { if (a.subcategory) subCounts[a.subcategory] = (subCounts[a.subcategory] || 0) + 1; });
  var trending = Object.keys(subCounts).filter(function(k) { return subCounts[k] >= 2; }).sort(function(a, b) { return subCounts[b] - subCounts[a]; }).slice(0, 3);

  async function onSub(e) {
    e.preventDefault();
    if (!email || email.indexOf("@") < 0) return;
    try { await fetch(SB_URL + "/rest/v1/subscribers", { method: "POST", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ email: email, subscribed_at: new Date().toISOString() }) }); } catch(x) {}
    setSubbed(true);
  }

  var CSS = '@import url("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap");*{box-sizing:border-box;margin:0;padding:0}.lb-h{background:#1A1714;color:#FAF8F5;padding:18px 24px 14px;position:sticky;top:0;z-index:100}.lb-mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.lb-t{font-family:"Instrument Serif",Georgia,serif;font-size:28px;font-weight:400;letter-spacing:-.5px;line-height:1}.lb-t span{color:#D4A853}.lb-st{font-family:"DM Sans",sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#8A847C;margin-top:3px}.lb-sb{background:none;border:1px solid #3A3530;color:#8A847C;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:.2s}.lb-sb:hover{border-color:#D4A853;color:#D4A853}.lb-hb{display:flex;gap:6px}.lb-si{width:100%;padding:9px 14px;background:#2A2520;border:1px solid #3A3530;border-radius:8px;color:#FAF8F5;font-family:"DM Sans",sans-serif;font-size:13px;outline:none;margin-bottom:10px}.lb-si:focus{border-color:#D4A853}.lb-si::placeholder{color:#5A554F}.lb-ds{display:flex;gap:6px;overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none}.lb-ds::-webkit-scrollbar{display:none}.lb-dc{font-family:"DM Sans",sans-serif;font-size:12px;padding:5px 13px;border-radius:20px;border:1px solid #3A3530;background:transparent;color:#8A847C;cursor:pointer;transition:.2s;white-space:nowrap;display:flex;align-items:center;gap:4px}.lb-dc:hover{border-color:#5A554F;color:#C0BAB2}.lb-dc.a{background:#D4A853;border-color:#D4A853;color:#1A1714;font-weight:500}.lb-dc-n{font-size:10px;opacity:.6}.lb-cs{display:flex;gap:4px;padding:10px 24px;overflow-x:auto;background:var(--cat-bg);border-bottom:1px solid var(--cat-border);-ms-overflow-style:none;scrollbar-width:none;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}.lb-cs::-webkit-scrollbar{display:none}.lb-c{font-family:"DM Sans",sans-serif;font-size:11px;padding:5px 10px;border-radius:20px;border:1px solid var(--chip-border);background:transparent;color:var(--chip-text);cursor:pointer;white-space:nowrap;transition:.2s;display:flex;align-items:center;gap:4px;scroll-snap-align:start}.lb-c:hover{border-color:var(--chip-hover)}.lb-c.a{background:var(--chip-active-bg);border-color:var(--chip-active-bg);color:var(--chip-active-text)}.lb-cn{font-size:10px;background:rgba(0,0,0,.08);padding:1px 6px;border-radius:10px}.lb-c.a .lb-cn{background:rgba(255,255,255,.15)}.lb-cl{border-color:#B71C1C;color:#B71C1C}.lb-cl.a{background:#B71C1C;border-color:#B71C1C;color:#fff}.lb-ld{width:6px;height:6px;border-radius:50%;background:#B71C1C;display:inline-block;animation:lp 1.5s infinite}.lb-cl.a .lb-ld{background:#fff}@keyframes lp{0%,100%{opacity:1}50%{opacity:.4}}.lb-ct{max-width:700px;margin:0 auto;padding:20px 20px 40px}.lb-dh{font-family:"Instrument Serif",Georgia,serif;font-size:20px;color:var(--text);margin-bottom:2px}.lb-dn{font-family:"DM Sans",sans-serif;font-size:12px;color:#9A958E;margin-bottom:4px}.lb-upd{font-family:"DM Sans",sans-serif;font-size:11px;color:#B0AAA2;margin-bottom:6px}.lb-tr{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}.lb-tr-t{font-family:"DM Sans",sans-serif;font-size:11px;color:#9A958E;padding:3px 0}.lb-tr-p{font-family:"DM Sans",sans-serif;font-size:11px;padding:3px 10px;border-radius:12px;background:var(--sub-bg);color:var(--sub-text);cursor:pointer;transition:.2s;border:none}.lb-tr-p:hover{color:var(--text)}.lb-k{background:var(--card);border:1px solid var(--card-border);border-radius:10px;margin-bottom:6px;position:relative;overflow:hidden;transition:.25s}.lb-k:hover{border-color:var(--card-hover);box-shadow:0 2px 10px var(--shadow)}.lb-k.x{border-color:var(--card-exp-border);box-shadow:0 4px 20px var(--shadow);margin-bottom:12px}.lb-kb{border-left:3px solid #B71C1C}.lb-ac{position:absolute;left:0;top:0;bottom:0;width:3px}.lb-t1{padding:12px 14px 12px 16px;cursor:pointer;display:flex;align-items:center;gap:10px}.lb-t1l{flex:1;min-width:0}.lb-t1m{display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap}.lb-bg{font-family:"DM Sans",sans-serif;font-size:9px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;padding:2px 7px;border-radius:3px;color:#fff}.lb-bb{background:#B71C1C;display:flex;align-items:center;gap:4px}.lb-su{font-family:"DM Sans",sans-serif;font-size:9px;padding:2px 6px;border-radius:3px;color:var(--sub-text);background:var(--sub-bg)}.lb-tm{font-family:"DM Sans",sans-serif;font-size:10px;color:#C0BAB2}.lb-tl{font-family:"DM Sans",sans-serif;font-size:13.5px;line-height:1.4;color:var(--text)}.lb-ch{font-size:18px;color:#C0BAB2;flex-shrink:0;transition:transform .25s,color .2s;user-select:none}.lb-k.x .lb-ch{transform:rotate(180deg);color:#D4A853}.lb-t2{padding:0 16px 14px;border-top:1px solid var(--divider)}.lb-hl{font-family:"Instrument Serif",Georgia,serif;font-size:17px;line-height:1.3;color:var(--text);margin:12px 0 8px}.lb-sm{font-family:"DM Sans",sans-serif;font-size:13px;line-height:1.65;color:var(--muted);margin-bottom:10px}.lb-wm{padding:10px 12px;background:var(--wim-bg);border:1px solid var(--wim-border);border-radius:8px;margin-bottom:10px}.lb-wl{font-family:"DM Sans",sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#C09A3A;margin-bottom:3px}.lb-wt{font-family:"DM Sans",sans-serif;font-size:12.5px;line-height:1.55;color:var(--wim-text)}.lb-ft{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.lb-sr{font-family:"DM Sans",sans-serif;font-size:11px;color:#B0AAA2}.lb-sr span{color:#9A958E}.lb-ax{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.lb-sh{font-family:"DM Sans",sans-serif;font-size:11px;font-weight:500;color:var(--chip-text);padding:5px 12px;border:1px solid var(--chip-border);border-radius:20px;background:var(--card);cursor:pointer;transition:.2s;white-space:nowrap;text-decoration:none}.lb-sh:hover{border-color:var(--chip-hover)}.lb-dp{display:inline-flex;align-items:center;gap:5px;font-family:"DM Sans",sans-serif;font-size:11px;font-weight:500;color:#8B6914;text-decoration:none;padding:5px 12px;border:1px solid #D4A853;border-radius:20px;background:linear-gradient(135deg,#FDF6E8,#FBF0D8);transition:.2s;white-space:nowrap}.lb-dp:hover{background:linear-gradient(135deg,#FBF0D8,#F5E6C0);transform:translateY(-1px);box-shadow:0 2px 8px rgba(212,168,83,.2)}.lb-inl{margin:8px 0 12px;padding:14px 16px;border-radius:10px;background:var(--card);border:1px dashed var(--card-border)}.lb-inl-t{font-family:"DM Sans",sans-serif;font-size:13px;color:var(--text);font-weight:500;margin-bottom:8px}.lb-inl-f{display:flex;gap:6px}.lb-inl-i{flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--chip-border);background:var(--bg);color:var(--text);font-family:"DM Sans",sans-serif;font-size:12px;outline:none}.lb-inl-i:focus{border-color:#D4A853}.lb-inl-b{padding:8px 16px;border-radius:8px;border:none;background:#D4A853;color:#1A1714;font-family:"DM Sans",sans-serif;font-size:12px;font-weight:600;cursor:pointer}.lb-inl-ok{font-family:"DM Sans",sans-serif;font-size:13px;color:#D4A853}.lb-nl{max-width:700px;margin:0 auto;padding:0 20px 60px}.lb-nb{background:var(--nl-bg);border-radius:12px;padding:28px 24px;text-align:center}.lb-nt{font-family:"Instrument Serif",Georgia,serif;font-size:22px;color:#FAF8F5;margin-bottom:6px}.lb-nd{font-family:"DM Sans",sans-serif;font-size:13px;color:#8A847C;margin-bottom:16px}.lb-nf{display:flex;gap:8px;max-width:400px;margin:0 auto}.lb-ni{flex:1;padding:10px 14px;border-radius:8px;border:1px solid #3A3530;background:#2A2520;color:#FAF8F5;font-family:"DM Sans",sans-serif;font-size:13px;outline:none}.lb-ni:focus{border-color:#D4A853}.lb-ni::placeholder{color:#5A554F}.lb-nx{padding:10px 20px;border-radius:8px;border:none;background:#D4A853;color:#1A1714;font-family:"DM Sans",sans-serif;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}.lb-no{font-family:"DM Sans",sans-serif;font-size:14px;color:#D4A853}.lb-btt{position:fixed;bottom:24px;right:24px;width:40px;height:40px;border-radius:50%;background:var(--chip-active-bg);color:var(--chip-active-text);border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px var(--shadow);transition:.3s;z-index:50;opacity:0;pointer-events:none}.lb-btt.v{opacity:1;pointer-events:auto}.lb-btt:hover{transform:translateY(-2px)}.lb-se{text-align:center;padding:50px 20px;font-family:"DM Sans",sans-serif}.lb-se p{font-size:14px;color:#9A958E}.lb-se .e{color:#C62828}.lb-sk{padding:14px 16px;margin-bottom:6px;border-radius:10px;background:var(--card);border:1px solid var(--card-border)}.lb-sk-badge{width:60px;height:16px;border-radius:3px;background:var(--sub-bg);margin-bottom:8px}.lb-sk-line{height:14px;border-radius:4px;background:var(--sub-bg)}.lb-sk-l1{width:90%;margin-bottom:6px}.lb-sk-l2{width:60%}.lb-sk,.lb-sk-badge,.lb-sk-line{animation:shimmer 1.5s infinite}@keyframes shimmer{0%{opacity:.6}50%{opacity:.3}100%{opacity:.6}}@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.lb-fi{animation:fi .3s ease forwards}';

  var lightVars = "--bg:#FAF8F5;--text:#1A1714;--muted:#5A554F;--card:#fff;--card-border:#E8E4DE;--card-hover:#CCC8C0;--card-exp-border:#B0AAA2;--shadow:rgba(26,23,20,.05);--divider:#F0ECE7;--cat-bg:#F3EFEA;--cat-border:#E0DBD4;--chip-border:#D4CFC7;--chip-text:#6B665E;--chip-hover:#9A958E;--chip-active-bg:#1A1714;--chip-active-text:#FAF8F5;--sub-text:#8A847C;--sub-bg:#F0ECE7;--wim-bg:linear-gradient(135deg,#FDFAF3,#FBF6EA);--wim-border:#EDE4CC;--wim-text:#5A4A2A;--nl-bg:#1A1714";
  var darkVars = "--bg:#111010;--text:#E8E4E0;--muted:#A09A92;--card:#1C1B19;--card-border:#2A2825;--card-hover:#3A3835;--card-exp-border:#4A4845;--shadow:rgba(0,0,0,.3);--divider:#2A2825;--cat-bg:#161514;--cat-border:#2A2825;--chip-border:#3A3835;--chip-text:#9A958E;--chip-hover:#5A5855;--chip-active-bg:#D4A853;--chip-active-text:#1A1714;--sub-text:#8A847C;--sub-bg:#2A2825;--wim-bg:linear-gradient(135deg,#1E1C18,#22201A);--wim-border:#3A3530;--wim-text:#C0A860;--nl-bg:#1C1B19";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Instrument Serif', Georgia, serif", transition: "background .3s" }}>
      <style dangerouslySetInnerHTML={{ __html: ":root{" + (dark ? darkVars : lightVars) + "}" + CSS }} />

      <header className="lb-h">
        <div className="lb-mh">
          <div>
            <div className="lb-t">Le <span>Bref</span></div>
            <div className="lb-st">Today's world, briefly</div>
          </div>
          <div className="lb-hb">
            <button className="lb-sb" onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"}>{dark ? "\u2600" : "\u263E"}</button>
            <button className="lb-sb" onClick={function() { setSearch(!search); setQuery(""); }}>{search ? "\u2715" : "\u2315"}</button>
          </div>
        </div>
        {search && <input ref={sRef} className="lb-si" placeholder="Search highlights..." value={query} onChange={function(e) { setQuery(e.target.value); }} />}
        <div className="lb-ds">
          {dates.slice(0, 7).map(function(d) {
            return <button key={d} className={"lb-dc" + (selDate === d ? " a" : "")} onClick={function() {
              setSelDate(d);
              setExpId(null);
              setSelCat("all");
              // Use cached SSG data if available
              if (initialArticles[d]) {
                setArticles(initialArticles[d]);
                if (initialArticles[d].length > 0) setLastUpdated(initialArticles[d][0].created_at);
              }
            }}>
              {dateLabel(d)}
              {dateCounts[d] && <span className="lb-dc-n">({dateCounts[d]})</span>}
            </button>;
          })}
        </div>
      </header>

      <div className="lb-cs">
        {CATS.map(function(cat) {
          if (cat.id === "breaking" && !hasBrk) return null;
          var live = cat.isLive && hasBrk;
          return <button key={cat.id} className={"lb-c" + (selCat === cat.id ? " a" : "") + (live ? " lb-cl" : "")} onClick={function() { setSelCat(cat.id); setExpId(null); }}>
            {live ? <span className="lb-ld" /> : <span>{cat.icon}</span>}
            {" "}{cat.label}
            {cat.id !== "all" && cc[cat.id] > 0 && <span className="lb-cn">{cc[cat.id]}</span>}
          </button>;
        })}
      </div>

      <div className="lb-ct">
        {err ? (
          <div className="lb-se"><p className="e">{err}</p></div>
        ) : loading ? (
          <>{[0,1,2,3,4].map(function(i) { return <Skeleton key={i} />; })}</>
        ) : (<>
          <h2 className="lb-dh">{selDate && fmtDate(selDate)}</h2>
          <p className="lb-dn">{filtered.length + " highlight" + (filtered.length !== 1 ? "s" : "")}{selCat !== "all" && (" in " + ((CATS.find(function(c) { return c.id === selCat; }) || {}).label || ""))}</p>
          {updatedText && <p className="lb-upd">Updated {updatedText}</p>}

          {trending.length > 0 && selCat === "all" && (
            <div className="lb-tr">
              <span className="lb-tr-t">Trending:</span>
              {trending.map(function(t) { return <button key={t} className="lb-tr-p" onClick={function() { setQuery(t.replace(/-/g, " ")); setSearch(true); }}>{fmtSub(t)}</button>; })}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="lb-se"><p>No highlights found{query ? " matching your search" : ""}.</p></div>
          ) : filtered.map(function(a, i) {
            var ex = expId === a.id;
            var src = Array.isArray(a.sources) ? a.sources : [];
            var brk = a.category === "breaking";
            var card = <div key={a.id} className={"lb-k lb-fi" + (ex ? " x" : "") + (brk ? " lb-kb" : "")} style={{ animationDelay: (i * 0.04) + "s" }}>
              <div className="lb-ac" style={{ background: catCol(a.category) }} />
              <div className="lb-t1" onClick={function() { setExpId(ex ? null : a.id); }}>
                <div className="lb-t1l">
                  <div className="lb-t1m">
                    {brk ? <span className="lb-bg lb-bb"><span className="lb-ld" style={{ background: "#fff", width: 5, height: 5 }} /> BREAKING</span>
                      : <span className="lb-bg" style={{ background: catCol(a.category) }}>{a.category}</span>}
                    {a.subcategory && <span className="lb-su">{fmtSub(a.subcategory)}</span>}
                    {a.time_published && <span className="lb-tm">{a.time_published}</span>}
                  </div>
                  <div className="lb-tl">{a.tldr}</div>
                </div>
                <div className="lb-ch">{"\u2304"}</div>
              </div>
              {ex && <div className="lb-t2">
                <div className="lb-hl">{a.headline}</div>
                <div className="lb-sm">{a.summary}</div>
                {a.why_it_matters && <div className="lb-wm"><div className="lb-wl">{"\u2726"} Why It Matters</div><div className="lb-wt">{a.why_it_matters}</div></div>}
                <div className="lb-ft">
                  <div className="lb-sr">{src.length > 0 && <>Sources: <span>{src.join(" \u00B7 ")}</span></>}</div>
                  <div className="lb-ax">
                    <button className="lb-sh" onClick={function(e) { doShare(a, e); }}>Share</button>
                    <a href={aLink(a)} className="lb-sh">Permalink</a>
                    <a href={claudeUrl(a)} target="_blank" rel="noopener noreferrer" className="lb-dp">{"\u2726"} Go deeper {"\u2192"}</a>
                  </div>
                </div>
              </div>}
            </div>;
            if (i === 2 && !subbed) return <>{card}<InlineNL key="inl" /></>;
            return card;
          })}
        </>)}
      </div>

      <div className="lb-nl">
        <div className="lb-nb">
          <div className="lb-nt">Get Le Bref in your inbox</div>
          <div className="lb-nd">The day's most important stories, delivered every morning. Free forever.</div>
          {subbed ? <div className="lb-no">{"\u2713"} You're in! See you tomorrow morning.</div>
          : <div className="lb-nf">
              <input className="lb-ni" type="email" placeholder="your@email.com" value={email} onChange={function(e) { setEmail(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") onSub(e); }} />
              <button className="lb-nx" onClick={onSub}>Subscribe</button>
            </div>}
        </div>
      </div>

      <button className={"lb-btt" + (showTop ? " v" : "")} onClick={function() { window.scrollTo({ top: 0, behavior: "smooth" }); }}>{"\u2191"}</button>
    </div>
  );
}
