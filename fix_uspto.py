#!/usr/bin/env python3
"""
Sentinel — Build 42: USPTO
Lisää USPTO-linkit Company-moduuliin (Solo)
Pro-tason live Markbase API-kutsu lisätään App.tsx:n searchCompany-funktioon
"""

import os

ENGINES_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/utils/osintEngines.ts')
APP_FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

# ── 1. osintEngines.ts — lisää USPTO-linkit Company-moduuliin ─────────────
OLD_BENEFICIAL = """    { label: '─── BENEFICIAL OWNERSHIP', value: '', type: 'info' },"""

NEW_BENEFICIAL = """    { label: '─── INTELLECTUAL PROPERTY (USPTO)', value: '', type: 'info' },
    { label: 'USPTO Trademark Search', value: `https://tmsearch.uspto.gov/search/search-information?searchInput=${company}&searchOption=BASIC`, type: 'link' },
    { label: 'USPTO Patent Search', value: `https://ppubs.uspto.gov/pubwebapp/external.html#/search?query=${company}`, type: 'link' },
    { label: 'USPTO Trademark by Owner', value: `https://tmsearch.uspto.gov/search/search-information?searchInput=${company}&searchOption=OWNER`, type: 'link' },
    { label: '─── BENEFICIAL OWNERSHIP', value: '', type: 'info' },"""

# ── 2. App.tsx — korvaa searchCompany Pro-tason live USPTO-haulla ──────────
OLD_SEARCH_COMPANY = "  const searchCompany = () => run('Company / Org',   input, () => getCompanyResults(encodeURIComponent(input.trim())));"

NEW_SEARCH_COMPANY = """  const searchCompany = () => run('Company / Org', input, async () => {
    const q = input.trim();
    const encoded = encodeURIComponent(q);
    const results = getCompanyResults(encoded);

    // Pro: live USPTO Markbase API-haku
    if (isPro) {
      try {
        const r = await fetch(`https://markbase.co/search?query=${encoded}&limit=5`);
        const d = await r.json();
        if (d.hits && d.hits.length > 0) {
          results.push({ label: '─── USPTO LIVE TRADEMARK RESULTS', value: '', type: 'info' });
          d.hits.forEach((hit: any) => {
            const status = hit.status_code === '800' ? '✅ Active' : '⚠️ Inactive';
            results.push({
              label: `${hit.word_mark} — ${hit.owner_name} (${status})`,
              value: `https://tmsearch.uspto.gov/search/search-information?searchInput=${encodeURIComponent(hit.word_mark)}&searchOption=BASIC`,
              type: 'link'
            });
          });
        } else {
          results.push({ label: '─── USPTO LIVE TRADEMARK RESULTS', value: '', type: 'info' });
          results.push({ label: 'No active trademarks found', value: '', type: 'data' });
        }
      } catch {
        results.push({ label: 'USPTO Live Search', value: 'Could not fetch trademark data', type: 'data' });
      }
    }

    return results;
  });"""

def patch_engines():
    with open(ENGINES_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_BENEFICIAL not in content:
        print("❌ osintEngines.ts: BENEFICIAL OWNERSHIP -kohtaa ei löydy")
        return False

    backup = ENGINES_FILE + '.backup_uspto'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_BENEFICIAL, NEW_BENEFICIAL)

    with open(ENGINES_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ USPTO-linkit lisätty Company-moduuliin (osintEngines.ts)")
    print(f"📦 Backup: {backup}")
    return True

def patch_app():
    with open(APP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_SEARCH_COMPANY not in content:
        print("❌ App.tsx: searchCompany-funktiota ei löydy")
        return False

    backup = APP_FILE + '.backup_uspto'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_SEARCH_COMPANY, NEW_SEARCH_COMPANY)

    with open(APP_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ USPTO live Markbase API-haku lisätty Pro-käyttäjille (App.tsx)")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    ok1 = patch_engines()
    ok2 = patch_app()
    if ok1 and ok2:
        print("\n✅ USPTO lisätty onnistuneesti!")
    else:
        print("\n❌ Jokin meni pieleen — tarkista virheet yllä")
