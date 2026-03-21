import { sbFetch } from "../../db";

export async function GET() {
  var articles = [];
  try {
    articles = await sbFetch("articles", "select=headline,tldr,summary,category,published_date,time_published&order=created_at.desc&limit=30");
  } catch (e) {}

  function esc(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function slug(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  var items = articles.map(function(a) {
    var link = "https://lebref.news/article/" + a.published_date + "/" + slug(a.headline);
    return "<item><title>" + esc(a.headline) + "</title><link>" + link + "</link><description>" + esc(a.tldr) + "</description><category>" + esc(a.category) + "</category><pubDate>" + new Date(a.published_date + "T" + (a.time_published || "12:00") + ":00Z").toUTCString() + "</pubDate></item>";
  }).join("\n");

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n<title>Le Bref</title>\n<link>https://lebref.news</link>\n<description>Today\'s world, briefly. AI-powered daily news digest.</description>\n<language>en</language>\n<atom:link href="https://lebref.news/api/rss" rel="self" type="application/rss+xml"/>\n' + items + "\n</channel>\n</rss>";

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
  });
}
