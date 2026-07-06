#!/usr/bin/env python3
"""
Sentinel — Build 42: 
1. UpgradeScreen — lisätään puuttuvat AI-ominaisuudet
2. Versio päivitetään 2.8.0:aan
"""

import os

UPGRADE_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/UpgradeScreen.tsx')
APP_FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

# ── 1. UpgradeScreen — lisätään kaikki 7 AI-ominaisuutta ─────────────────
OLD_PRO_FEATURES = """            {[
              '✓ Everything in Solo',
              '✓ FBI + Interpol wanted checks',
              '✓ All 50 US state wanted lists',
              '✓ Canadian provincial databases',
              '✓ AI Risk Score (0–100)',
              '✓ AI Contradiction Detection',
              '✓ AI Investigation Strategy',
              '✓ AI Case Report Generation',
              '✓ 100 AI queries/month',
            ].map((f, i) => <Text key={i} style={[s.feature, s.proFeature]}>{f}</Text>)}"""

NEW_PRO_FEATURES = """            {[
              '✓ Everything in Solo',
              '✓ FBI + Interpol wanted checks',
              '✓ All 50 US state wanted lists',
              '✓ Canadian provincial databases',
              '✓ OFAC · UN · EU · BIS sanctions',
              '✓ AI Risk Score (0–100) — LOW / MEDIUM / HIGH / CRITICAL',
              '✓ AI Deep Background Analysis',
              '✓ AI Contradiction Detection',
              '✓ AI Investigation Strategy',
              '✓ AI Case Report Generation',
              '✓ AI Field Notes Summary',
              '✓ AI Image Intelligence',
              '✓ 100 AI queries/month',
            ].map((f, i) => <Text key={i} style={[s.feature, s.proFeature]}>{f}</Text>)}"""

# ── 2. App.tsx — versio 2.8.0 ─────────────────────────────────────────────
OLD_VERSION_STRINGS = [
    "'OSINT FIELD TOOLKIT'",
    "v2.4",
    "v2.7",
    "2.4.0",
    "2.7.0",
]

def patch_upgrade():
    with open(UPGRADE_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_PRO_FEATURES not in content:
        print("❌ UpgradeScreen: Pro features -listaa ei löydy")
        return False

    backup = UPGRADE_FILE + '.backup_v28'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_PRO_FEATURES, NEW_PRO_FEATURES)

    with open(UPGRADE_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ UpgradeScreen päivitetty — kaikki 7 AI-ominaisuutta lisätty")
    print(f"📦 Backup: {backup}")
    return True

def patch_version():
    with open(APP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    backup = APP_FILE + '.backup_v28'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    changes = 0

    # Etsi versioviittaukset App.tsx:stä
    version_patterns = [
        ('v2.4.0', 'v2.8.0'),
        ('v2.7.0', 'v2.8.0'),
        ('v2.4', 'v2.8'),
        ('v2.7', 'v2.8'),
        ('2.4.0', '2.8.0'),
        ('2.7.0', '2.8.0'),
    ]

    for old, new in version_patterns:
        if old in content:
            content = content.replace(old, new)
            changes += 1
            print(f"✅ Versio päivitetty: {old} → {new}")

    with open(APP_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    if changes == 0:
        print("⚠️  Versioviittauksia ei löydy App.tsx:stä — tarkista manuaalisesti")
    
    return True

def patch_appjson():
    # Päivitetään myös app.json
    app_json = os.path.expanduser('~/Downloads/SentinelV4/app.json')
    if not os.path.exists(app_json):
        print("⚠️  app.json ei löydy")
        return

    with open(app_json, 'r', encoding='utf-8') as f:
        content = f.read()

    backup = app_json + '.backup_v28'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    changes = 0
    for old, new in [('2.7.0', '2.8.0'), ('2.4.0', '2.8.0')]:
        if old in content:
            content = content.replace(old, new)
            changes += 1
            print(f"✅ app.json versio päivitetty: {old} → {new}")

    with open(app_json, 'w', encoding='utf-8') as f:
        f.write(content)

    if changes == 0:
        print("⚠️  app.json: versioviittauksia ei löydy")

if __name__ == '__main__':
    patch_upgrade()
    patch_version()
    patch_appjson()
    print("\n✅ Kaikki päivitykset tehty!")
