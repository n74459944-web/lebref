# ============================================
# Daily Digest - Main Engine
# ============================================
# This is the brain of the operation. It:
# 1. Pulls articles from RSS feeds
# 2. Sends them to Claude for summarization
# 3. Stores the results in Supabase
#
# Run manually:   python digest_engine.py
# Run on schedule: python run_daily.py
# ============================================

import os
import json
import hashlib
from datetime import datetime, timezone

import feedparser
import anthropic
from supabase import create_client
from dotenv import load_dotenv

from feeds import FEEDS, VALID_CATEGORIES

# Load environment variables from .env file
load_dotenv()

# ============================================
# Setup connections
# ============================================

claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY"),
)

ARTICLES_PER_FEED = int(os.getenv("ARTICLES_PER_FEED", "5"))


# ============================================
# Step 1: Scrape RSS feeds
# ============================================

def scrape_feeds():
    """
    Pull the latest articles from all RSS feeds.
    Returns a list of raw articles with title, link, source name, 
    description (if available), and default category.
    
    Think of this like a newspaper delivery truck dropping off 
    raw papers from every publisher. We haven't read them yet.
    """
    raw_articles = []

    for feed_config in FEEDS:
        try:
            print(f"  Fetching: {feed_config['name']}...")
            feed = feedparser.parse(feed_config["url"])

            for entry in feed.entries[:ARTICLES_PER_FEED]:
                # Get the article description (the raw text we'll summarize)
                description = ""
                if hasattr(entry, "summary"):
                    description = entry.summary
                elif hasattr(entry, "description"):
                    description = entry.description

                # Get publish time
                time_published = ""
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    time_published = datetime(*entry.published_parsed[:6]).strftime("%H:%M")

                raw_articles.append({
                    "title": entry.get("title", "No title"),
                    "link": entry.get("link", ""),
                    "description": description,
                    "source_name": feed_config["name"],
                    "default_category": feed_config["default_category"],
                    "time_published": time_published,
                })

        except Exception as e:
            print(f"  ⚠ Error fetching {feed_config['name']}: {e}")
            continue

    print(f"\n  ✓ Scraped {len(raw_articles)} raw articles from {len(FEEDS)} feeds")
    return raw_articles


# ============================================
# Step 2: Send to Claude for summarization
# ============================================

def summarize_with_claude(raw_articles):
    """
    Send all raw articles to Claude in ONE API call.
    Claude picks the top 8-10 most important stories,
    categorizes them, and generates all 3 tiers of content.
    
    This is like hiring an editor who reads every article 
    and writes the front page for you.
    """

    # Build the article list for the prompt
    articles_text = ""
    for i, article in enumerate(raw_articles):
        articles_text += f"""
--- Article {i + 1} ---
Title: {article['title']}
Source: {article['source_name']}
Default Category: {article['default_category']}
Description: {article['description'][:500]}
URL: {article['link']}
Time: {article['time_published']}
"""

    prompt = f"""You are the editor of "The Daily Digest," a news summary site. 
Your job is to read all the articles below and select the TOP 8-10 most 
important and interesting stories of the day.

For each selected story, generate:

1. **category**: One of: politics, economics, technology, world, science
   (Re-categorize from the default if the story fits better elsewhere)

2. **headline**: A clear, informative headline (not clickbait). Max 80 chars.

3. **tldr**: A single-line TL;DR that tells the whole story in one sentence. 
   This is what people see first. Make it punchy and informative. 
   Include a key number or fact. Max 120 chars.

4. **summary**: A 3-4 sentence summary covering: what happened, key details, 
   and what's next. Be factual and concise. No opinions.

5. **why_it_matters**: 2 sentences explaining the broader significance. 
   Connect it to how it affects regular people or what to watch for next.

6. **sources**: Array of source names (e.g., ["Reuters", "BBC"])

7. **source_urls**: Array of the original article URLs

8. **time_published**: Time string like "14:30" (use the article's time, 
   or estimate based on when it was published)

RULES:
- Pick stories that span ALL categories. Aim for at least 1 per category.
- Avoid duplicate stories (same event from different sources = combine them).
- Write in your own words. Do NOT copy article text.
- Be brief. Every word must earn its place.
- The tldr should make sense on its own without clicking.

Return ONLY a JSON array of objects. No markdown, no explanation.

Here are today's articles:
{articles_text}
"""

    print("  Sending to Claude for summarization...")

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    # Extract the text response
    response_text = response.content[0].text

    # Clean up in case Claude wraps it in markdown code blocks
    response_text = response_text.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()

    # Parse the JSON
    try:
        digested_articles = json.loads(response_text)
        print(f"  ✓ Claude selected {len(digested_articles)} stories")
        return digested_articles
    except json.JSONDecodeError as e:
        print(f"  ✗ Failed to parse Claude's response: {e}")
        print(f"  Response was: {response_text[:500]}")
        return []


# ============================================
# Step 3: Store in Supabase
# ============================================

def store_articles(digested_articles):
    """
    Save each summarized article to Supabase.
    Uses a hash of the headline to avoid duplicates.
    
    Think of this like filing each finished story 
    into the newspaper's archive.
    """
    stored = 0
    skipped = 0

    for article in digested_articles:
        # Validate category
        category = article.get("category", "world").lower()
        if category not in VALID_CATEGORIES:
            category = "world"

        # Create a hash for deduplication
        headline = article.get("headline", "")
        headline_hash = hashlib.md5(headline.encode()).hexdigest()

        row = {
            "published_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "category": category,
            "headline": headline,
            "tldr": article.get("tldr", ""),
            "summary": article.get("summary", ""),
            "why_it_matters": article.get("why_it_matters", ""),
            "sources": article.get("sources", []),
            "source_urls": article.get("source_urls", []),
            "time_published": article.get("time_published", ""),
            "headline_hash": headline_hash,
        }

        try:
            supabase.table("articles").insert(row).execute()
            stored += 1
            print(f"    ✓ Stored: {headline[:60]}...")
        except Exception as e:
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                skipped += 1
                print(f"    ⊘ Duplicate, skipped: {headline[:60]}...")
            else:
                print(f"    ✗ Error storing article: {e}")

    print(f"\n  ✓ Stored {stored} new articles, skipped {skipped} duplicates")
    return stored


# ============================================
# Main: Run the full pipeline
# ============================================

def run_digest():
    """
    The full pipeline: scrape → summarize → store.
    This is what runs once per day (or whenever you want).
    """
    print("=" * 50)
    print(f"📰 Daily Digest - {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 50)

    # Step 1: Scrape
    print("\n🔍 Step 1: Scraping RSS feeds...")
    raw_articles = scrape_feeds()

    if not raw_articles:
        print("  ✗ No articles found. Check your internet connection and feed URLs.")
        return

    # Step 2: Summarize
    print("\n🤖 Step 2: AI summarization...")
    digested = summarize_with_claude(raw_articles)

    if not digested:
        print("  ✗ Summarization failed. Check your Anthropic API key.")
        return

    # Step 3: Store
    print("\n💾 Step 3: Storing in database...")
    stored = store_articles(digested)

    # Done!
    print("\n" + "=" * 50)
    print(f"✅ Done! {stored} new stories added to the digest.")
    print("=" * 50)


# Run when called directly
if __name__ == "__main__":
    run_digest()
