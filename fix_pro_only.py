#!/usr/bin/env python3
"""
Sentinel — Rajoitetaan Shodan ja Pro API-avaimet vain Pro-käyttäjille
"""

import os

APP_FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')
SETTINGS_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/SettingsScreen.tsx')

# ── 1. Shodan Pro-only tarkistus App.tsx:ssä ─────────────────────────────
OLD_SHODAN = """    // Shodan live lookup
    if (shodanKey) {"""

NEW_SHODAN = """    // Shodan live lookup — Pro only
    if (isPro && shodanKey) {"""

# ── 2. SettingsScreen — piilotetaan Pro API-avaimet Solo-käyttäjiltä ─────
# SettingsScreen tarvitsee isPro propin
OLD_SETTINGS_PROPS = """interface Props {
  onBack: () => void;
}"""

NEW_SETTINGS_PROPS = """interface Props {
  onBack: () => void;
  isPro?: boolean;
}"""

OLD_SETTINGS_FN = """export default function SettingsScreen({ onBack }: Props) {"""
NEW_SETTINGS_FN = """export default function SettingsScreen({ onBack, isPro = false }: Props) {"""

# Piilotetaan Pro API-avaimet Solo-käyttäjiltä
OLD_PRO_KEYS_UI = """              <Text style={[s.apiLabel, { marginTop: 16, color: C.accent }]}>PRO — Paid API Keys</Text>
              <Text style={[s.apiHint, { marginBottom: 12 }]}>These keys unlock additional Pro data sources. Costs apply per search.</Text>

              <Text style={s.apiLabel}>Tracerfy API Key</Text>"""

NEW_PRO_KEYS_UI = """              {isPro && (
              <><Text style={[s.apiLabel, { marginTop: 16, color: C.accent }]}>PRO — Paid API Keys</Text>
              <Text style={[s.apiHint, { marginBottom: 12 }]}>These keys unlock additional Pro data sources. Costs apply per search.</Text>

              <Text style={s.apiLabel}>Tracerfy API Key</Text>"""

OLD_PRO_KEYS_END = """              <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim, marginBottom: 0 }]} onPress={handleSaveAPIKeys}>
                <Text style={[s.actionBtnText, { color: C.green }]}>💾 Save API Keys</Text>
              </TouchableOpacity>"""

NEW_PRO_KEYS_END = """              </>)}
              <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim, marginBottom: 0 }]} onPress={handleSaveAPIKeys}>
                <Text style={[s.actionBtnText, { color: C.green }]}>💾 Save API Keys</Text>
              </TouchableOpacity>"""

# ── 3. Lisätään isPro prop SettingsScreen-kutsuun App.tsx:ssä ────────────
OLD_SETTINGS_CALL = "  if (screen === 'settings') return wrapAnimated(<SettingsScreen onBack={goHome} />);"
NEW_SETTINGS_CALL = "  if (screen === 'settings') return wrapAnimated(<SettingsScreen onBack={goHome} isPro={isPro} />);"

def patch_app():
    with open(APP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_SHODAN not in content:
        errors.append("Shodan check")
    if OLD_SETTINGS_CALL not in content:
        errors.append("SettingsScreen call")

    if errors:
        print(f"❌ App.tsx: ei löydy: {', '.join(errors)}")
        return False

    backup = APP_FILE + '.backup_pro_only'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_SHODAN, NEW_SHODAN)
    content = content.replace(OLD_SETTINGS_CALL, NEW_SETTINGS_CALL)

    with open(APP_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ App.tsx: Shodan rajoitettu Pro-only, isPro lisätty SettingsScreen:lle")
    return True

def patch_settings():
    with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_SETTINGS_PROPS not in content:
        errors.append("Props interface")
    if OLD_SETTINGS_FN not in content:
        errors.append("function signature")
    if OLD_PRO_KEYS_UI not in content:
        errors.append("Pro keys UI")
    if OLD_PRO_KEYS_END not in content:
        errors.append("Pro keys end")

    if errors:
        print(f"❌ SettingsScreen.tsx: ei löydy: {', '.join(errors)}")
        return False

    backup = SETTINGS_FILE + '.backup_pro_only'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_SETTINGS_PROPS, NEW_SETTINGS_PROPS)
    content = content.replace(OLD_SETTINGS_FN, NEW_SETTINGS_FN)
    content = content.replace(OLD_PRO_KEYS_UI, NEW_PRO_KEYS_UI)
    content = content.replace(OLD_PRO_KEYS_END, NEW_PRO_KEYS_END)

    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ SettingsScreen.tsx: Pro API-avaimet piilotettu Solo-käyttäjiltä")
    return True

if __name__ == '__main__':
    ok1 = patch_app()
    ok2 = patch_settings()
    if ok1 and ok2:
        print("\n✅ Kaikki Pro-rajoitukset lisätty!")
    else:
        print("\n⚠️ Jokin epäonnistui")
