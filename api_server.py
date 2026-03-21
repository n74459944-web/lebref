# ============================================
# Daily Digest - API Route (Next.js Backend)
# ============================================
# This is the API your frontend calls to get articles.
# Put this file at: pages/api/articles.py (if using Next.js API routes)
# OR use it as a standalone FastAPI server (see below).
#
# For simplicity, here's a FastAPI version you can run separately
# or adapt to your Next.js app's API routes in JavaScript.
# ============================================
#
# To run:  python api_server.py
# Then your frontend fetches from: http://localhost:8000/api/articles?date=2026-03-20
# ============================================

import os
from datetime import datetime, timezone
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Daily Digest API")

# Allow your frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set this to your domain
    allow_methods=["GET"],
    allow_headers=["*"],
)

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY"),
)


@app.get("/api/articles")
def get_articles(
    date: str = Query(None, description="Date in YYYY-MM-DD format"),
    category: str = Query(None, description="Filter by category"),
    search: str = Query(None, description="Search headlines and summaries"),
):
    """
    Fetch articles for a given date.
    
    Examples:
      GET /api/articles?date=2026-03-20
      GET /api/articles?date=2026-03-20&category=economics
      GET /api/articles?search=bitcoin
    """
    # Default to today if no date provided
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Build query
    query = supabase.table("articles") \
        .select("id, category, headline, tldr, summary, why_it_matters, sources, source_urls, time_published") \
        .eq("published_date", date) \
        .order("created_at", desc=True)

    # Apply category filter
    if category and category != "all":
        query = query.eq("category", category)

    # Execute query
    result = query.execute()
    articles = result.data if result.data else []

    # Apply search filter (client-side for simplicity)
    if search:
        search_lower = search.lower()
        articles = [
            a for a in articles
            if search_lower in a["headline"].lower()
            or search_lower in a["tldr"].lower()
            or search_lower in a["summary"].lower()
        ]

    return {
        "date": date,
        "count": len(articles),
        "articles": articles,
    }


@app.get("/api/dates")
def get_available_dates(limit: int = Query(30, description="Number of dates to return")):
    """
    Get a list of dates that have articles.
    Your frontend uses this to populate the date picker.
    """
    result = supabase.table("articles") \
        .select("published_date") \
        .order("published_date", desc=True) \
        .limit(limit) \
        .execute()

    # Get unique dates
    dates = sorted(set(row["published_date"] for row in result.data), reverse=True)

    return {"dates": dates}


@app.get("/api/stats")
def get_stats():
    """
    Get overall stats for the site (total articles, categories, etc.)
    Nice for a dashboard or about page.
    """
    result = supabase.table("articles") \
        .select("id, category, published_date") \
        .execute()

    rows = result.data if result.data else []

    return {
        "total_articles": len(rows),
        "total_days": len(set(r["published_date"] for r in rows)),
        "categories": list(set(r["category"] for r in rows)),
        "articles_by_category": {
            cat: len([r for r in rows if r["category"] == cat])
            for cat in set(r["category"] for r in rows)
        },
    }


# ============================================
# Run the server
# ============================================

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Daily Digest API on http://localhost:8000")
    print("   Docs available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
