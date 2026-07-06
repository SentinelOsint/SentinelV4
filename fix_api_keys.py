#!/usr/bin/env python3
"""
Sentinel — Build 43: lisätään Tracerfy, BatchData ja Shodan API-avaimet SettingsScreen:iin
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/SettingsScreen.tsx')

# ── 1. Lisätään state-muuttujat ───────────────────────────────────────────
OLD_STATE = "  const [abuseIPDBKey, setAbuseIPDBKey] = useState('');"
NEW_STATE = """  const [abuseIPDBKey,  setAbuseIPDBKey]  = useState('');
  const [tracerfyKey,   setTracerfyKey]   = useState('');
  const [batchDataKey,  setBatchDataKey]  = useState('');
  const [shodanKey,     setShodanKey]     = useState('');"""

# ── 2. Ladataan avaimet käynnistyksessä ───────────────────────────────────
OLD_LOAD = "    if (settings.abuseIPDBKey) setAbuseIPDBKey(settings.abuseIPDBKey as string);"
NEW_LOAD = """    if (settings.abuseIPDBKey)  setAbuseIPDBKey(settings.abuseIPDBKey as string);
    if (settings.tracerfyKey)   setTracerfyKey(settings.tracerfyKey as string);
    if (settings.batchDataKey)  setBatchDataKey(settings.batchDataKey as string);
    if (settings.shodanKey)     setShodanKey(settings.shodanKey as string);"""

# ── 3. Tallennetaan avaimet ───────────────────────────────────────────────
OLD_SAVE = """  const handleSaveAPIKeys = async () => {
    await Storage.saveSetting('abuseIPDBKey', abuseIPDBKey.trim());
    await Storage.saveSetting('greyNoiseKey', greyNoiseKey.trim());
    await AuditLog.log('SETTINGS_CHANGE', 'API keys updated');
    Alert.alert('✓ Saved', 'API keys saved securely on this device.');
  };"""

NEW_SAVE = """  const handleSaveAPIKeys = async () => {
    await Storage.saveSetting('abuseIPDBKey', abuseIPDBKey.trim());
    await Storage.saveSetting('greyNoiseKey', greyNoiseKey.trim());
    await Storage.saveSetting('tracerfyKey',  tracerfyKey.trim());
    await Storage.saveSetting('batchDataKey', batchDataKey.trim());
    await Storage.saveSetting('shodanKey',    shodanKey.trim());
    await AuditLog.log('SETTINGS_CHANGE', 'API keys updated');
    Alert.alert('✓ Saved', 'API keys saved securely on this device.');
  };"""

# ── 4. Lisätään UI-kentät ─────────────────────────────────────────────────
OLD_UI = """              <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim, marginBottom: 0 }]} onPress={handleSaveAPIKeys}>
                <Text style={[s.actionBtnText, { color: C.green }]}>💾 Save API Keys</Text>
              </TouchableOpacity>"""

NEW_UI = """              <Text style={[s.apiLabel, { marginTop: 16, color: C.accent }]}>PRO — Paid API Keys</Text>
              <Text style={[s.apiHint, { marginBottom: 12 }]}>These keys unlock additional Pro data sources. Costs apply per search.</Text>

              <Text style={s.apiLabel}>Tracerfy API Key</Text>
              <Text style={s.apiHint}>$0.02/search — skip trace & people search at tracerfy.com</Text>
              <TextInput
                style={s.apiInput}
                value={tracerfyKey}
                onChangeText={setTracerfyKey}
                placeholder="Paste your Tracerfy key"
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />

              <Text style={s.apiLabel}>BatchData API Key</Text>
              <Text style={s.apiHint}>Phone & address intelligence at batchdata.io</Text>
              <TextInput
                style={s.apiInput}
                value={batchDataKey}
                onChangeText={setBatchDataKey}
                placeholder="Paste your BatchData key"
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />

              <Text style={s.apiLabel}>Shodan API Key</Text>
              <Text style={s.apiHint}>Network intelligence & device search at shodan.io</Text>
              <TextInput
                style={s.apiInput}
                value={shodanKey}
                onChangeText={setShodanKey}
                placeholder="Paste your Shodan key"
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />

              <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim, marginBottom: 0 }]} onPress={handleSaveAPIKeys}>
                <Text style={[s.actionBtnText, { color: C.green }]}>💾 Save API Keys</Text>
              </TouchableOpacity>"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_STATE not in content:
        errors.append("state muuttujat")
    if OLD_LOAD not in content:
        errors.append("load avaimet")
    if OLD_SAVE not in content:
        errors.append("save funktio")
    if OLD_UI not in content:
        errors.append("UI kentät")

    if errors:
        print(f"❌ Ei löydy: {', '.join(errors)}")
        return False

    backup = FILE + '.backup_api_keys'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_STATE, NEW_STATE)
    content = content.replace(OLD_LOAD, NEW_LOAD)
    content = content.replace(OLD_SAVE, NEW_SAVE)
    content = content.replace(OLD_UI, NEW_UI)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Tracerfy, BatchData ja Shodan API-avaimet lisätty SettingsScreen:iin!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
