#!/usr/bin/env python3
"""
Sentinel — Pro preview fix #2
1. Siirtää Pro preview -kortin hakutulosten jälkeen
2. Korjaa Upgrade to Pro -painikkeen avaamaan UpgradeScreenin
"""

import os

APP_FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')
SCREEN_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/OneInputScreen.tsx')

# ── Fix 1: App.tsx — lisää onUpgrade prop OneInputScreenille ──────────────
OLD_APP = "if (screen === 'one_input') return wrapAnimated(<OneInputScreen isPro={isPro} onBack={goHome} />);"
NEW_APP = "if (screen === 'one_input') return wrapAnimated(<OneInputScreen isPro={isPro} onBack={goHome} onUpgrade={() => setScreen('upgrade')} />);"

# ── Fix 2: OneInputScreen.tsx — lisää onUpgrade Props-interfaceen ─────────
OLD_PROPS = """interface Props {
  isPro: boolean;
  onBack: () => void;
}"""

NEW_PROPS = """interface Props {
  isPro: boolean;
  onBack: () => void;
  onUpgrade: () => void;
}"""

# ── Fix 3: OneInputScreen.tsx — lisää onUpgrade destrukturoituna ──────────
OLD_DESTRUCTURE = "export default function OneInputScreen({ isPro, onBack }: Props) {"
NEW_DESTRUCTURE = "export default function OneInputScreen({ isPro, onBack, onUpgrade }: Props) {"

# ── Fix 4: OneInputScreen.tsx — siirrä Pro preview hakutulosten jälkeen ───
# Poistetaan Pro preview nykyiseltä paikaltaan
OLD_PREVIEW_LOCATION = """            {!isPro && (
              <View style={styles.proPreviewCard}>
                <View style={styles.proPreviewHeader}>
                  <Text style={styles.proPreviewTitle}>⭐ Pro Features</Text>
                  <View style={styles.proPreviewBadge}>
                    <Text style={styles.proPreviewBadgeText}>PRO ONLY</Text>
                  </View>
                </View>
                <Text style={styles.proPreviewSubtitle}>
                  Pro provides deeper analysis and broader coverage than Solo.
                </Text>
                <View style={styles.proPreviewList}>
                  {[
                    { icon: '🔒', text: 'AI Risk Score (0–100) — LOW / MEDIUM / HIGH / CRITICAL' },
                    { icon: '🔒', text: 'Deep Background Analysis — comprehensive subject profile' },
                    { icon: '🔒', text: 'Contradiction Detection — cross-source inconsistencies' },
                    { icon: '🔒', text: 'FBI, Interpol & all 50 US state wanted checks' },
                    { icon: '🔒', text: 'Canadian federal, provincial & city wanted databases' },
                    { icon: '🔒', text: 'OFAC, UN, EU & BIS sanctions screening' },
                    { icon: '🔒', text: 'Investigation Strategy — recommended next steps' },
                    { icon: '🔒', text: 'AI Case Report Generation' },
                  ].map((item, i) => (
                    <View key={i} style={styles.proPreviewRow}>
                      <Text style={styles.proPreviewIcon}>{item.icon}</Text>
                      <Text style={styles.proPreviewItem}>{item.text}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.proPreviewBtn}
                  onPress={onBack}
                >
                  <Text style={styles.proPreviewBtnText}>Upgrade to Pro →</Text>
                </TouchableOpacity>
              </View>
            )}"""

# Korvataan tyhjällä nykyisellä paikalla
NEW_PREVIEW_LOCATION = ""

# Lisätään Pro preview oikeaan paikkaan — hakutulosten jälkeen ennen bottomPad
OLD_BOTTOM_PAD = "            <View style={styles.bottomPad} />"
NEW_BOTTOM_PAD = """            {!isPro && (
              <View style={styles.proPreviewCard}>
                <View style={styles.proPreviewHeader}>
                  <Text style={styles.proPreviewTitle}>⭐ Pro Features</Text>
                  <View style={styles.proPreviewBadge}>
                    <Text style={styles.proPreviewBadgeText}>PRO ONLY</Text>
                  </View>
                </View>
                <Text style={styles.proPreviewSubtitle}>
                  Pro provides deeper analysis and broader coverage than Solo.
                </Text>
                <View style={styles.proPreviewList}>
                  {[
                    { icon: '🔒', text: 'AI Risk Score (0–100) — LOW / MEDIUM / HIGH / CRITICAL' },
                    { icon: '🔒', text: 'Deep Background Analysis — comprehensive subject profile' },
                    { icon: '🔒', text: 'Contradiction Detection — cross-source inconsistencies' },
                    { icon: '🔒', text: 'FBI, Interpol & all 50 US state wanted checks' },
                    { icon: '🔒', text: 'Canadian federal, provincial & city wanted databases' },
                    { icon: '🔒', text: 'OFAC, UN, EU & BIS sanctions screening' },
                    { icon: '🔒', text: 'Investigation Strategy — recommended next steps' },
                    { icon: '🔒', text: 'AI Case Report Generation' },
                  ].map((item, i) => (
                    <View key={i} style={styles.proPreviewRow}>
                      <Text style={styles.proPreviewIcon}>{item.icon}</Text>
                      <Text style={styles.proPreviewItem}>{item.text}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.proPreviewBtn}
                  onPress={onUpgrade}
                >
                  <Text style={styles.proPreviewBtnText}>Upgrade to Pro →</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.bottomPad} />"""

def patch_app():
    with open(APP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_APP not in content:
        print("❌ App.tsx: OneInputScreen riviä ei löydy")
        return False

    content = content.replace(OLD_APP, NEW_APP)

    with open(APP_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ App.tsx päivitetty — onUpgrade prop lisätty")
    return True

def patch_screen():
    with open(SCREEN_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []

    if OLD_PROPS not in content:
        errors.append("Props interface")
    if OLD_DESTRUCTURE not in content:
        errors.append("function destructure")
    if OLD_PREVIEW_LOCATION not in content:
        errors.append("Pro preview nykyinen sijainti")
    if OLD_BOTTOM_PAD not in content:
        errors.append("bottomPad")

    if errors:
        print(f"❌ OneInputScreen.tsx: ei löydy: {', '.join(errors)}")
        return False

    content = content.replace(OLD_PROPS, NEW_PROPS)
    content = content.replace(OLD_DESTRUCTURE, NEW_DESTRUCTURE)
    content = content.replace(OLD_PREVIEW_LOCATION, NEW_PREVIEW_LOCATION)
    content = content.replace(OLD_BOTTOM_PAD, NEW_BOTTOM_PAD)

    # Backup
    backup = SCREEN_FILE + '.backup_pro_preview2'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(open(SCREEN_FILE, 'r', encoding='utf-8').read())

    with open(SCREEN_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ OneInputScreen.tsx päivitetty — preview siirretty ja painike korjattu")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    ok1 = patch_app()
    ok2 = patch_screen()
    if ok1 and ok2:
        print("\n✅ Kaikki muutokset tehty onnistuneesti!")
    else:
        print("\n❌ Jokin meni pieleen — tarkista virheet yllä")
