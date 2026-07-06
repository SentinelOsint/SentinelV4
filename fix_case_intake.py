#!/usr/bin/env python3
"""
Sentinel — Build 43: lisätään CaseIntakeScreen App.tsx:ään
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

# ── 1. Lisätään import ────────────────────────────────────────────────────
OLD_IMPORT = "import WatchListScreen from './src/screens/WatchListScreen';"
NEW_IMPORT = """import WatchListScreen from './src/screens/WatchListScreen';
import CaseIntakeScreen from './src/screens/CaseIntakeScreen';"""

# ── 2. Lisätään screen route ──────────────────────────────────────────────
OLD_ROUTE = "  if (screen === 'watchlist') return wrapAnimated(<WatchListScreen isPro={isPro} onBack={goHome} />);"
NEW_ROUTE = """  if (screen === 'watchlist') return wrapAnimated(<WatchListScreen isPro={isPro} onBack={goHome} />);
  if (screen === 'case_intake') return wrapAnimated(<CaseIntakeScreen isPro={isPro} onBack={goHome} onUpgrade={() => setScreen('upgrade')} />);"""

# ── 3. Lisätään moduuli päävalikkoon ─────────────────────────────────────
OLD_MENU = "      { id: 'upgrade', icon: '⭐', title: 'Upgrade to Pro', desc: 'Plans & pricing' },"
NEW_MENU = """      { id: 'case_intake', icon: '📋', title: 'Case Intake', desc: 'AI pre-assessment & pricing' },
      { id: 'upgrade', icon: '⭐', title: 'Upgrade to Pro', desc: 'Plans & pricing' },"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_IMPORT not in content:
        errors.append("WatchListScreen import")
    if OLD_ROUTE not in content:
        errors.append("watchlist route")
    if OLD_MENU not in content:
        errors.append("upgrade menu item")

    if errors:
        print(f"❌ Ei löydy: {', '.join(errors)}")
        return False

    backup = FILE + '.backup_case_intake'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_IMPORT, NEW_IMPORT)
    content = content.replace(OLD_ROUTE, NEW_ROUTE)
    content = content.replace(OLD_MENU, NEW_MENU)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ CaseIntakeScreen lisätty App.tsx:ään!")
    print("   - Import lisätty")
    print("   - Screen route lisätty")
    print("   - Moduuli lisätty päävalikkoon")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
