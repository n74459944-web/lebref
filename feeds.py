# ============================================
# Daily Digest - News Source Configuration
# ============================================
# Each feed has a name, RSS URL, and default category.
# The AI will re-categorize if needed, but the default
# helps when a feed covers multiple topics.
# ============================================

# Add or remove feeds here to customize your digest.
# The scraper pulls the latest articles from each feed,
# then the AI picks the most important ones.

FEEDS = [
    # --- POLITICS ---
    {
        "name": "Reuters - Politics",
        "url": "https://feeds.reuters.com/Reuters/PoliticsNews",
        "default_category": "politics",
    },
    {
        "name": "AP News - Politics",
        "url": "https://rsshub.app/apnews/topics/politics",
        "default_category": "politics",
    },
    {
        "name": "BBC - Politics",
        "url": "http://feeds.bbci.co.uk/news/politics/rss.xml",
        "default_category": "politics",
    },

    # --- ECONOMICS ---
    {
        "name": "Reuters - Business",
        "url": "https://feeds.reuters.com/reuters/businessNews",
        "default_category": "economics",
    },
    {
        "name": "CNBC - Economy",
        "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
        "default_category": "economics",
    },
    {
        "name": "Financial Times",
        "url": "https://www.ft.com/rss/home",
        "default_category": "economics",
    },

    # --- TECHNOLOGY ---
    {
        "name": "TechCrunch",
        "url": "https://techcrunch.com/feed/",
        "default_category": "technology",
    },
    {
        "name": "The Verge",
        "url": "https://www.theverge.com/rss/index.xml",
        "default_category": "technology",
    },
    {
        "name": "Ars Technica",
        "url": "https://feeds.arstechnica.com/arstechnica/index",
        "default_category": "technology",
    },

    # --- WORLD ---
    {
        "name": "BBC - World",
        "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
        "default_category": "world",
    },
    {
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "default_category": "world",
    },
    {
        "name": "Reuters - World",
        "url": "https://feeds.reuters.com/Reuters/worldNews",
        "default_category": "world",
    },

    # --- SCIENCE ---
    {
        "name": "Nature - News",
        "url": "https://www.nature.com/nature.rss",
        "default_category": "science",
    },
    {
        "name": "Science Daily",
        "url": "https://www.sciencedaily.com/rss/all.xml",
        "default_category": "science",
    },
    {
        "name": "NASA - Breaking News",
        "url": "https://www.nasa.gov/rss/dyn/breaking_news.rss",
        "default_category": "science",
    },
]

# Valid categories (must match your frontend)
VALID_CATEGORIES = ["politics", "economics", "technology", "world", "science"]
