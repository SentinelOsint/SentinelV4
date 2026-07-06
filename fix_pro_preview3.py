#!/usr/bin/env python3
"""
Sentinel — Pro preview fix #3
Siirtää Pro preview -kortin hakutulosten yläpuolelle (PDF-napin jälkeen)
"""

import os

SCREEN_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/OneInputScreen.tsx')

# Poistetaan Pro preview tulosten lopusta
OLD_PREVIEW_AT_BOTTOM = """            {!isPro && (
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

NEW_PREVIEW_AT_BOTTOM = "            <View style={styles.bottomPad} />"

# Lisätään Pro preview PDF-napin jälkeen, ennen module results -otsikkoa
OLD_SECTION_TITLE = """            {/* Module results */}
            <Text style={styles.sectionTitle}>
              {result.modules.reduce((acc, m) => acc + m.links.length, 0)} sources across {result.modules.length} modules
            </Text>"""

NEW_SECTION_TITLE = """            {/* Pro preview — Solo users only */}
            {!isPro && (
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

            {/* Module results */}
            <Text style={styles.sectionTitle}>
              {result.modules.reduce((acc, m) => acc + m.links.length, 0)} sources across {result.modules.length} modules
            </Text>"""

def patch():
    with open(SCREEN_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []

    if OLD_PREVIEW_AT_BOTTOM not in content:
        errors.append("Pro preview lopussa")
    if OLD_SECTION_TITLE not in content:
        errors.append("Module results -otsikko")

    if errors:
        print(f"❌ Ei löydy: {', '.join(errors)}")
        return False

    # Backup
    backup = SCREEN_FILE + '.backup_pro_preview3'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_PREVIEW_AT_BOTTOM, NEW_PREVIEW_AT_BOTTOM)
    content = content.replace(OLD_SECTION_TITLE, NEW_SECTION_TITLE)

    with open(SCREEN_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Pro preview siirretty hakutulosten yläpuolelle!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
