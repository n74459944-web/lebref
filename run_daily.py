# ============================================
# Daily Digest - Scheduler
# ============================================
# Runs the digest engine automatically every day.
#
# Usage:
#   python run_daily.py
#
# This keeps running in the background and triggers
# the digest at 6:00 AM UTC every day.
#
# For production, you'd use a cron job or a service
# like Railway/Render instead of this script.
# ============================================

import schedule
import time
from digest_engine import run_digest


def job():
    """Run the daily digest pipeline."""
    print("\n⏰ Scheduled run triggered!\n")
    try:
        run_digest()
    except Exception as e:
        print(f"❌ Digest failed with error: {e}")
        print("   Will retry at next scheduled time.")


# ============================================
# Schedule: Run at 6:00 AM UTC every day
# ============================================
# Why 6 AM UTC?
#   - That's 1 AM Eastern / 10 PM Pacific (previous day)
#   - By morning, your digest is ready for readers
#   - Most news from the previous day is already published
#
# Change the time below if you want a different schedule.
# ============================================

schedule.every().day.at("06:00").do(job)

print("📅 Daily Digest Scheduler")
print("   Scheduled to run every day at 06:00 UTC")
print("   Press Ctrl+C to stop\n")

# Also run once immediately on startup
print("🚀 Running initial digest now...\n")
job()

# Then keep running on schedule
while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute
