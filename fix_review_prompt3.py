#!/usr/bin/env python3
"""
Sentinel — Korjaa arvostelupyyntö käyttämään oikeita Storage-metodeja
"""

import os

APP_FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

OLD_REVIEW = """  const requestReviewIfEligible = async () => {
    try {
      const REVIEW_KEY = 'sentinel_search_count';
      const stored = await Storage.get<number>(REVIEW_KEY);
      const count = (stored || 0) + 1;
      await Storage.set(REVIEW_KEY, count);
      if (count === 3 || count === 10 || count === 25) {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
        }
      }
    } catch (e) {
      console.warn('Review request failed:', e);
    }
  };"""

NEW_REVIEW = """  const requestReviewIfEligible = async () => {
    try {
      const REVIEW_KEY = 'sentinel_search_count';
      const settings = await Storage.getSettings();
      const count = ((settings[REVIEW_KEY] as number) || 0) + 1;
      await Storage.saveSetting(REVIEW_KEY, count);
      if (count === 3 || count === 10 || count === 25) {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
        }
      }
    } catch (e) {
      console.warn('Review request failed:', e);
    }
  };"""

def patch():
    with open(APP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_REVIEW not in content:
        print("❌ Arvostelupyyntöä ei löydy")
        return False

    backup = APP_FILE + '.backup_review3'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_REVIEW, NEW_REVIEW)

    with open(APP_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Arvostelupyyntö korjattu oikeilla Storage-metodeilla!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
