#!/usr/bin/env python3
"""
Sentinel — Solo Pro Preview patch
Korvaa yksinkertaisen upgradeCard-komponentin kattavammalla Pro preview -kortilla
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/OneInputScreen.tsx')

OLD_UPGRADE = '''            {!isPro && (
              <View style={styles.upgradeCard}>
                <Text style={styles.upgradeText}>
                  🤖 Upgrade to Pro for AI-powered analysis of all findings
                </Text>
              </View>
            )}'''

NEW_UPGRADE = '''            {!isPro && (
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
            )}'''

OLD_STYLES = '''  upgradeCard:    { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card,
                    borderRadius: 10, padding: SPACE.sm, borderWidth: 1, borderColor: C.border },
  upgradeText:    { color: C.textDim, fontSize: FONT.xs, textAlign: 'center' },'''

NEW_STYLES = '''  upgradeCard:    { marginHorizontal: SPACE.md, marginBottom: SPACE.sm, backgroundColor: C.card,
                    borderRadius: 10, padding: SPACE.sm, borderWidth: 1, borderColor: C.border },
  upgradeText:    { color: C.textDim, fontSize: FONT.xs, textAlign: 'center' },

  proPreviewCard:    { marginHorizontal: SPACE.md, marginBottom: SPACE.md, backgroundColor: '#0d1f0d',
                       borderRadius: 12, padding: SPACE.md, borderWidth: 1.5, borderColor: '#2d5a2d' },
  proPreviewHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                       marginBottom: 6 },
  proPreviewTitle:   { color: '#4CAF50', fontSize: FONT.sm, fontWeight: '700' },
  proPreviewBadge:   { backgroundColor: '#1a3a1a', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  proPreviewBadgeText: { color: '#4CAF50', fontSize: 9, fontWeight: '700' },
  proPreviewSubtitle: { color: '#81C784', fontSize: FONT.xs, marginBottom: SPACE.sm, lineHeight: 16 },
  proPreviewList:    { gap: 6, marginBottom: SPACE.md },
  proPreviewRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  proPreviewIcon:    { fontSize: 13, marginTop: 1 },
  proPreviewItem:    { color: '#A5D6A7', fontSize: FONT.xs, flex: 1, lineHeight: 17 },
  proPreviewBtn:     { backgroundColor: '#2d5a2d', borderRadius: 8, padding: 12,
                       alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  proPreviewBtnText: { color: '#4CAF50', fontSize: FONT.sm, fontWeight: '700' },'''

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Tarkista löytyykö korvattava teksti
    if OLD_UPGRADE not in content:
        print("❌ upgradeCard-komponenttia ei löydy — tiedosto saattaa olla eri muodossa.")
        return False

    if OLD_STYLES not in content:
        print("❌ upgradeCard-tyylejä ei löydy — tarkista styles-osio.")
        return False

    # Tee korvaukset
    content = content.replace(OLD_UPGRADE, NEW_UPGRADE)
    content = content.replace(OLD_STYLES, NEW_STYLES)

    # Tallenna backup
    backup = FILE + '.backup_pro_preview'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(open(FILE, 'r', encoding='utf-8').read())

    # Kirjoita muutettu tiedosto
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Pro preview päivitetty onnistuneesti!")
    print(f"📦 Backup tallennettu: {backup}")
    return True

if __name__ == '__main__':
    patch()
