#!/usr/bin/env python3
"""
Sentinel — Korjaa SettingsScreen Pro API-avaimet
"""

import os

SETTINGS_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/SettingsScreen.tsx')

OLD_PROPS = "interface Props { onBack: () => void; }"
NEW_PROPS = "interface Props { onBack: () => void; isPro?: boolean; }"

OLD_FN = "export default function SettingsScreen({ onBack }: Props) {"
NEW_FN = "export default function SettingsScreen({ onBack, isPro = false }: Props) {"

OLD_PRO_KEYS_UI = "              <Text style={[s.apiLabel, { marginTop: 16, color: C.accent }]}>PRO — Paid API Keys</Text>"
NEW_PRO_KEYS_UI = "              {isPro && (<><Text style={[s.apiLabel, { marginTop: 16, color: C.accent }]}>PRO — Paid API Keys</Text>"

OLD_SHODAN_END = """              <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim, marginBottom: 0 }]} onPress={handleSaveAPIKeys}>
                <Text style={[s.actionBtnText, { color: C.green }]}>💾 Save API Keys</Text>
              </TouchableOpacity>"""

NEW_SHODAN_END = """              </>)}
              <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim, marginBottom: 0 }]} onPress={handleSaveAPIKeys}>
                <Text style={[s.actionBtnText, { color: C.green }]}>💾 Save API Keys</Text>
              </TouchableOpacity>"""

def patch():
    with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_PROPS not in content: errors.append("Props")
    if OLD_FN not in content: errors.append("function")
    if OLD_PRO_KEYS_UI not in content: errors.append("Pro keys UI")
    if OLD_SHODAN_END not in content: errors.append("Save button")

    if errors:
        print(f"❌ Ei löydy: {', '.join(errors)}")
        return False

    backup = SETTINGS_FILE + '.backup_pro_only2'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_PROPS, NEW_PROPS)
    content = content.replace(OLD_FN, NEW_FN)
    content = content.replace(OLD_PRO_KEYS_UI, NEW_PRO_KEYS_UI)
    content = content.replace(OLD_SHODAN_END, NEW_SHODAN_END)

    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ SettingsScreen päivitetty — Pro API-avaimet vain Pro-käyttäjille!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
