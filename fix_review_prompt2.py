#!/usr/bin/env python3
"""
Sentinel — Build 43: arvostelupyyntö onnistuneen haun jälkeen (fixed)
"""

import os

APP_FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

# ── 1. Lisätään import theme-importin jälkeen ─────────────────────────────
OLD_IMPORT = "} from './src/utils/theme';"
NEW_IMPORT = """} from './src/utils/theme';
import * as StoreReview from 'expo-store-review';"""

# ── 2. Korvataan run-funktio arvostelupyynnöllä ───────────────────────────
OLD_RUN = """  const run = async (module: string, query: string, fn: () => Promise<OsintResult[]> | OsintResult[]) => {
    if (!query.trim()) { Alert.alert('Required', 'Enter a value to search.'); return; }
    onUserInteraction();
    setLoading(true); setResults([]); setCurModule(module); setCurQuery(query.trim());
    try { setResults(await fn()); addToHistory(module, query.trim()); }
    catch (e: any) { Alert.alert('Error', e.message || 'Search failed'); }
    setLoading(false);
  };"""

NEW_RUN = """  const requestReviewIfEligible = async () => {
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
  };

  const run = async (module: string, query: string, fn: () => Promise<OsintResult[]> | OsintResult[]) => {
    if (!query.trim()) { Alert.alert('Required', 'Enter a value to search.'); return; }
    onUserInteraction();
    setLoading(true); setResults([]); setCurModule(module); setCurQuery(query.trim());
    try {
      const res = await fn();
      setResults(res);
      addToHistory(module, query.trim());
      if (res.length > 0) requestReviewIfEligible();
    }
    catch (e: any) { Alert.alert('Error', e.message || 'Search failed'); }
    setLoading(false);
  };"""

def patch():
    with open(APP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_IMPORT not in content:
        errors.append("theme import")
    if OLD_RUN not in content:
        errors.append("run-funktio")

    if errors:
        print(f"❌ Ei löydy: {', '.join(errors)}")
        return False

    backup = APP_FILE + '.backup_review2'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_IMPORT, NEW_IMPORT, 1)
    content = content.replace(OLD_RUN, NEW_RUN, 1)

    with open(APP_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Arvostelupyyntö lisätty!")
    print("   Pyyntö näytetään 3., 10. ja 25. onnistuneen haun jälkeen")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
