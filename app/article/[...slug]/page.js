import { sbFetch } from "../../db";
import ArticleView from "./ArticleView";

function slug(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export async function generateMetadata({ params }) {
  var p = await params;
  var date = p.slug?.[0];
  var artSlug = p.slug?.[1];
  if (!date || !artSlug) return { title: "Le Bref" };

  try {
    var articles = await sbFetch("articles", "published_date=eq." + date + "&select=headline,tldr,category");
    var match = articles.find(function(a) { return slug(a.headline) === artSlug; });
    if (match) {
      return {
        title: match.headline + " — Le Bref",
        description: match.tldr,
        openGraph: {
          title: match.headline,
          description: match.tldr,
          url: "https://lebref.news/article/" + date + "/" + artSlug,
          siteName: "Le Bref",
          type: "article",
        },
        twitter: {
          card: "summary",
          title: match.headline,
          description: match.tldr,
        },
      };
    }
  } catch (e) {}
  return { title: "Le Bref" };
}

export default async function ArticlePage({ params }) {
  var p = await params;
  var date = p.slug?.[0];
  var artSlug = p.slug?.[1];

  var article = null;
  try {
    var articles = await sbFetch("articles", "published_date=eq." + date + "&select=id,category,subcategory,headline,tldr,summary,why_it_matters,sources,source_urls,time_published");
    article = articles.find(function(a) { return slug(a.headline) === artSlug; }) || null;
  } catch (e) {}

  return <ArticleView article={article} date={date} />;
}
