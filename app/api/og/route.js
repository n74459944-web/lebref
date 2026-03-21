import { sbFetch } from "../../db";

export async function GET(request) {
  var url = new URL(request.url);
  var headline = url.searchParams.get("h") || "";
  var category = url.searchParams.get("c") || "";
  var date = url.searchParams.get("d") || new Date().toISOString().split("T")[0];

  if (!headline) {
    try {
      var articles = await sbFetch("articles", "select=headline,category,published_date&order=created_at.desc&limit=1");
      if (articles.length) {
        headline = articles[0].headline;
        category = articles[0].category;
        date = articles[0].published_date;
      }
    } catch (e) {}
  }

  if (!headline) headline = "Today's world, briefly.";

  var catUpper = (category || "le bref").toUpperCase();
  var truncHeadline = headline.length > 90 ? headline.slice(0, 87) + "..." : headline;

  var svg = '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">'
    + '<rect width="1200" height="630" fill="#1A1714"/>'
    + '<rect x="0" y="0" width="1200" height="6" fill="#D4A853"/>'
    + '<text x="60" y="80" font-family="Georgia,serif" font-size="36" fill="#FAF8F5">Le <tspan fill="#D4A853">Bref</tspan></text>'
    + '<text x="60" y="110" font-family="sans-serif" font-size="12" fill="#8A847C" letter-spacing="3" text-transform="uppercase">TODAY\'S WORLD, BRIEFLY</text>'
    + '<rect x="60" y="140" width="80" height="24" rx="4" fill="#D4A853"/>'
    + '<text x="100" y="157" font-family="sans-serif" font-size="11" fill="#1A1714" text-anchor="middle" font-weight="600">' + catUpper + '</text>'
    + '<text x="150" y="157" font-family="sans-serif" font-size="12" fill="#8A847C">' + date + '</text>'
    + '<foreignObject x="60" y="180" width="1080" height="350"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Georgia,serif;font-size:48px;line-height:1.25;color:#FAF8F5;word-wrap:break-word">' + truncHeadline.replace(/&/g,"&amp;").replace(/</g,"&lt;") + '</div></foreignObject>'
    + '<text x="60" y="590" font-family="sans-serif" font-size="14" fill="#8A847C">lebref.news</text>'
    + '</svg>';

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
