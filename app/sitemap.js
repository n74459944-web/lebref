import { sbFetch } from "../db";

function slug(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export default async function sitemap() {
  var entries = [{ url: "https://lebref.news", lastModified: new Date(), changeFrequency: "daily", priority: 1.0 }];

  try {
    var articles = await sbFetch("articles", "select=headline,published_date&order=created_at.desc&limit=200");
    articles.forEach(function(a) {
      entries.push({
        url: "https://lebref.news/article/" + a.published_date + "/" + slug(a.headline),
        lastModified: new Date(a.published_date + "T12:00:00Z"),
        changeFrequency: "never",
        priority: 0.7,
      });
    });
  } catch (e) {}

  return entries;
}
