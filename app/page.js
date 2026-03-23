import { sbFetch } from "./db";
import LeBref from "./LeBref";

export const revalidate = 300; // Revalidate every 5 minutes

export default async function Home() {
  var allDates = [];
  var dateCounts = {};
  var dateArticles = {};
  var err = null;

  try {
    // Fetch all recent articles in one call (includes French columns)
    var rows = await sbFetch(
      "articles",
      "select=id,category,subcategory,headline,tldr,summary,why_it_matters,headline_fr,tldr_fr,summary_fr,why_it_matters_fr,sources,source_urls,time_published,published_date,created_at&order=published_date.desc,time_published.desc&limit=500"
    );

    // Group by date
    var seen = {};
    rows.forEach(function (r) {
      var d = r.published_date;
      if (!seen[d]) {
        seen[d] = true;
        allDates.push(d);
      }
      dateCounts[d] = (dateCounts[d] || 0) + 1;
      if (!dateArticles[d]) dateArticles[d] = [];
      dateArticles[d].push(r);
    });

    allDates.sort(function (a, b) {
      return b.localeCompare(a);
    });
    allDates = allDates.slice(0, 14);
  } catch (e) {
    err = "Could not connect to database.";
  }

  return (
    <LeBref
      initialDates={allDates}
      initialDateCounts={dateCounts}
      initialArticles={dateArticles}
      initialError={err}
    />
  );
}
