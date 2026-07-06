#!/usr/bin/env python3
"""
Sentinel — Build 43: arvostelupyyntö onnistuneen haun jälkeen
Näytetään pyyntö kun käyttäjä on tehnyt 3. onnistuneen haun
"""

import os

APP_FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

# ── 1. Lisätään import ────────────────────────────────────────────────────
OLD_IMPORT = "import { C, IS_IPAD, SPACE } from './src/utils/theme';"
NEW_IMPORT = """import { C, IS_IPAD, SPACE } from './src/utils/theme';
import * as StoreReview from 'expo-store-review';"""

# ── 2. Lisätään arvostelupyyntölogiikka run-funktioon ────────────────────
OLD_RUN = """  const run = (module: string, input: string, fn: () => Promise<OsintResult[]>) => {"""

NEW_RUN = """  const requestReviewIfEligible = async () => {
    try {
      const key = 'sentinel_search_count';
      const stored = await Storage.get(key);
      const count = (stored || 0) + 1;
      await Storage.set(key, count);
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

  const run = (module: string, input: string, fn: () => Promise<OsintResult[]>) => {"""

# ── 3. Lisätään kutsu onnistuneen haun jälkeen ───────────────────────────
OLD_RUN_END = """    setResults(res);
    setSearching(false);"""

NEW_RUN_END = """    setResults(res);
    setSearching(false);
    if (res.length > 0) requestReviewIfEligible();"""

def patch():
    with open(APP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_IMPORT not in content:
        errors.append("import")
    if OLD_RUN not in content:
        errors.append("run-funktio")
    if OLD_RUN_END not in content:
        errors.append("run-funktio loppu")

    if errors:
        print(f"❌ Ei löydy: {', '.join(errors)}")
        return False

    backup = APP_FILE + '.backup_review'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_IMPORT, NEW_IMPORT)
    content = content.replace(OLD_RUN, NEW_RUN)
    content = content.replace(OLD_RUN_END, NEW_RUN_END)

    with open(APP_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Arvostelupyyntö lisätty!")
    print("   Pyyntö näytetään 3., 10. ja 25. onnistuneen haun jälkeen")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
