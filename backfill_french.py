# ============================================
# Le Bref — Backfill French Translations
# ============================================
# Run this ONCE after adding the French columns to your database.
# It finds every article missing a French headline, sends it to
# Claude for translation, and saves the result back to Supabase.
#
# Usage:
#   python backfill_french.py
#
# Requirements:
#   - Your .env file with SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY
#   - The French columns already added (run add-french-columns.sql first)
# ============================================

import os
import json
import time
from dotenv import load_dotenv
from supabase import create_client
from anthropic import Anthropic

load_dotenv(".env.local")

supabase = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)
claude = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# Fetch all articles that don't have a French headline yet
print("Fetching articles missing French translations...")
result = supabase.table("articles") \
    .select("id,headline,tldr,summary,why_it_matters") \
    .is_("headline_fr", "null") \
    .execute()

rows = result.data
print(f"Found {len(rows)} articles to translate.\n")

if len(rows) == 0:
    print("Nothing to do — all articles already have French translations!")
    exit()

translated = 0
errors = 0

for i, row in enumerate(rows):
    print(f"[{i+1}/{len(rows)}] Translating: {row['headline'][:60]}...")

    prompt = f"""Translate this news article into natural Quebec/Canadian French.
Do NOT do a word-for-word translation — adapt the headlines and phrasing
so they sound natural to a French-Canadian reader.

Return ONLY valid JSON with exactly these 4 fields, no markdown, no explanation:
{{
  "headline_fr": "...",
  "tldr_fr": "...",
  "summary_fr": "...",
  "why_it_matters_fr": "..."
}}

English content to translate:

Headline: {row['headline']}

TLDR: {row['tldr']}

Summary: {row['summary'] or 'N/A'}

Why it matters: {row['why_it_matters'] or 'N/A'}
"""

    try:
        response = claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = response.content[0].text.strip()
        # Clean up in case Claude wraps it in markdown code blocks
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]  # remove first line
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        french = json.loads(raw)

        # Only update fields that came back non-empty
        update = {}
        for key in ["headline_fr", "tldr_fr", "summary_fr", "why_it_matters_fr"]:
            if french.get(key):
                update[key] = french[key]

        if update:
            supabase.table("articles").update(update).eq("id", row["id"]).execute()
            translated += 1
            print(f"  -> {update.get('headline_fr', '?')[:60]}")
        else:
            print(f"  -> Empty response, skipping")
            errors += 1

    except json.JSONDecodeError as e:
        print(f"  -> JSON parse error: {e}")
        errors += 1
    except Exception as e:
        print(f"  -> Error: {e}")
        errors += 1

    # Small delay to avoid rate limits
    time.sleep(1)

print(f"\nDone! Translated: {translated}, Errors: {errors}")
