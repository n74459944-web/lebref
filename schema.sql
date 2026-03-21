-- ============================================
-- Daily Digest - Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor (one time)
-- Dashboard > SQL Editor > New Query > paste > Run
-- ============================================

-- Main table: stores every article ever processed
CREATE TABLE IF NOT EXISTS articles (
    id              BIGSERIAL PRIMARY KEY,
    
    -- When this article was published / processed
    published_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Category: politics, economics, technology, world, science
    category        TEXT NOT NULL,
    
    -- The 3 tiers of content
    headline        TEXT NOT NULL,
    tldr            TEXT NOT NULL,           -- Tier 1: one-line summary
    summary         TEXT NOT NULL,           -- Tier 2: 3-4 sentence detail
    why_it_matters  TEXT NOT NULL,           -- Tier 2: pre-generated analysis
    
    -- Metadata
    sources         TEXT[] NOT NULL,         -- Array of source names
    source_urls     TEXT[] DEFAULT '{}',     -- Array of original article URLs
    time_published  TEXT,                    -- Time string like "14:30"
    
    -- Deduplication: hash of headline to avoid storing the same story twice
    headline_hash   TEXT UNIQUE NOT NULL,
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast date + category lookups (the main query your frontend runs)
CREATE INDEX IF NOT EXISTS idx_articles_date_category 
    ON articles (published_date DESC, category);

-- Index for searching headlines and summaries
CREATE INDEX IF NOT EXISTS idx_articles_headline_search 
    ON articles USING GIN (to_tsvector('english', headline || ' ' || tldr));

-- ============================================
-- Row Level Security (keeps your data safe)
-- ============================================
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to READ articles (public site)
CREATE POLICY "Articles are publicly readable"
    ON articles FOR SELECT
    USING (true);

-- Only your backend (service role) can INSERT
-- The anon key can only read; the service key can write
CREATE POLICY "Only service role can insert"
    ON articles FOR INSERT
    WITH CHECK (true);

-- ============================================
-- Helpful view: today's digest
-- ============================================
CREATE OR REPLACE VIEW todays_digest AS
    SELECT id, category, headline, tldr, summary, why_it_matters, 
           sources, source_urls, time_published
    FROM articles
    WHERE published_date = CURRENT_DATE
    ORDER BY created_at DESC;
