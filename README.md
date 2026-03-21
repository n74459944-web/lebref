# 📰 The Daily Digest — Backend

An AI-powered news digest that scrapes RSS feeds, summarizes them with Claude,
and stores everything in a database. Your frontend reads from the database.

## How It Works (The Big Picture)

Think of it like a newspaper factory with 3 machines:

```
[RSS Feeds] → [Claude AI Editor] → [Supabase Database] → [Your Website]
   15 feeds      picks top 8-10       stores forever        readers see it
   ~75 articles  writes summaries     searchable archive    3-tier design
```

The factory runs once per day at 6 AM UTC. By morning, your digest is ready.


## Setup Guide (Step by Step)

### 1. Install Python Dependencies

Open PowerShell and run:

```powershell
cd daily-digest-backend
pip install -r requirements.txt
```

### 2. Create a Supabase Database (Free)

1. Go to https://supabase.com and create a free account
2. Click "New Project" — pick any name and password
3. Wait ~2 minutes for it to spin up
4. Go to **SQL Editor** (left sidebar) → click **New Query**
5. Copy-paste everything from `schema.sql` into the editor
6. Click **Run** — you should see "Success"
7. Go to **Settings** → **API** and copy:
   - The **Project URL** (looks like `https://abc123.supabase.co`)
   - The **anon public** key (long string starting with `eyJ...`)

### 3. Get a Claude API Key

1. Go to https://console.anthropic.com/
2. Create an account if you don't have one
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

### 4. Configure Your Environment

```powershell
# Copy the example file
Copy-Item .env.example .env

# Open it and paste your keys
notepad .env
```

Fill in your 3 values:
- `ANTHROPIC_API_KEY=sk-ant-your-key-here`
- `SUPABASE_URL=https://your-project.supabase.co`
- `SUPABASE_KEY=eyJ-your-anon-key-here`

### 5. Run Your First Digest!

```powershell
python digest_engine.py
```

You should see output like:
```
==================================================
📰 Daily Digest - 2026-03-20 06:00 UTC
==================================================

🔍 Step 1: Scraping RSS feeds...
  Fetching: Reuters - Politics...
  Fetching: AP News - Politics...
  ...
  ✓ Scraped 72 raw articles from 15 feeds

🤖 Step 2: AI summarization...
  Sending to Claude for summarization...
  ✓ Claude selected 9 stories

💾 Step 3: Storing in database...
    ✓ Stored: Senate Passes Emergency Spending Bill...
    ✓ Stored: Fed Holds Rates Steady...
    ...
  ✓ Stored 9 new articles, skipped 0 duplicates

==================================================
✅ Done! 9 new stories added to the digest.
==================================================
```

### 6. Start the API Server

```powershell
pip install fastapi uvicorn --break-system-packages
python api_server.py
```

Your API is now running at `http://localhost:8000`.
Check the auto-generated docs at `http://localhost:8000/docs`.

### 7. Run Daily (Automatic)

For development / testing:
```powershell
python run_daily.py
```

For production, use a cron job or deploy to Railway/Render
(they have free tiers and built-in cron scheduling).


## Project Structure

```
daily-digest-backend/
├── .env.example        # Template for your API keys
├── .env                # Your actual keys (never commit this)
├── requirements.txt    # Python dependencies
├── schema.sql          # Database schema (run once in Supabase)
├── feeds.py            # List of RSS news sources
├── digest_engine.py    # Main brain: scrape → summarize → store
├── api_server.py       # FastAPI server your frontend calls
├── run_daily.py        # Scheduler to run digest automatically
└── README.md           # You are here
```


## Costs

| What                  | Cost              |
|-----------------------|-------------------|
| Supabase (database)   | Free tier = 500MB |
| Claude API (~10 articles/day) | ~$0.08-0.15/day (~$3-5/month) |
| Hosting (Railway/Render) | Free tier available |
| **Total**             | **~$3-5/month**   |


## Connecting to Your Frontend

Update your Next.js frontend to fetch from the API instead of using
sample data. Replace the SAMPLE_DATA object with:

```javascript
// In your React component
const [articles, setArticles] = useState([]);

useEffect(() => {
  fetch(`http://localhost:8000/api/articles?date=${selectedDate}`)
    .then(res => res.json())
    .then(data => setArticles(data.articles));
}, [selectedDate]);
```


## Customizing

### Add/Remove News Sources
Edit `feeds.py` — just add or remove feed objects from the FEEDS list.

### Change Number of Daily Stories
Edit the prompt in `digest_engine.py` — change "TOP 8-10" to whatever you want.

### Change Categories
1. Update `VALID_CATEGORIES` in `feeds.py`
2. Update the CATEGORIES array in your frontend
3. Update the Claude prompt in `digest_engine.py`

### Run Multiple Times Per Day
Edit `run_daily.py` and add more schedule lines:
```python
schedule.every().day.at("06:00").do(job)  # Morning edition
schedule.every().day.at("18:00").do(job)  # Evening edition
```
