#!/usr/bin/env python3
"""
Sentinel — Build 43: Tracerfy, BatchData, Shodan API-avaimet (fixed)
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/SettingsScreen.tsx')

OLD_STATE = "  const [abuseIPDBKey,  setAbuseIPDBKey]  = useState('');\n  const [greyNoiseKey,  setGreyNoiseKey]  = useState('');"
NEW_STATE = "  const [abuseIPDBKey,  setAbuseIPDBKey]  = useState('');\n  const [greyNoiseKey,  setGreyNoiseKey]  = useState('');\n  const [tracerfyKey,   setTracerfyKey]   = useState('');\n  const [batchDataKey,  setBatchDataKey]  = useState('');\n  const [shodanKey,     setShodanKey]     = useState('');"

OLD_LOAD = "    if (settings.abuseIPDBKey) setAbuseIPDBKey(settings.abuseIPDBKey as string);\n    if (settings.greyNoiseKey) setGreyNoiseKey(settings.greyNoiseKey as string);"
NEW_LOAD = "    if (settings.abuseIPDBKey)  setAbuseIPDBKey(settings.abuseIPDBKey as string);\n    if (settings.greyNoiseKey)  setGreyNoiseKey(settings.greyNoiseKey as string);\n    if (settings.tracerfyKey)   setTracerfyKey(settings.tracerfyKey as string);\n    if (settings.batchDataKey)  setBatchDataKey(settings.batchDataKey as string);\n    if (settings.shodanKey)     setShodanKey(settings.shodanKey as string);"

OLD_SAVE = "    await Storage.saveSetting('abuseIPDBKey', abuseIPDBKey.trim());\n    await Storage.saveSetting('greyNoiseKey', greyNoiseKey.trim());"
NEW_SAVE = "    await Storage.saveSetting('abuseIPDBKey', abuseIPDBKey.trim());\n    await Storage.saveSetting('greyNoiseKey', greyNoiseKey.trim());\n    await Storage.saveSetting('tracerfyKey',  tracerfyKey.trim());\n    await Storage.saveSetting('batchDataKey', batchDataKey.trim());\n    await Storage.saveSetting('shodanKey',    shodanKey.trim());"

OLD_UI = "              <TouchableOpacity style={[s.actionBtn, { borderColor: C.green, backgroundColor: C.greenDim, marginBottom: 0 }]} onPress={handleSaveAPIKeys}>\n                <Text style={[s.actionBtnText, { color: C.green }]}>💾 Save API Keys</Text>\n              </TouchableOpacity>"

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
        errors.append("state")
    if OLD_LOAD not in content:
        errors.append("load")
    if OLD_SAVE not in content:
        errors.append("save")
    if OLD_UI not in content:
        errors.append("UI")

    if errors:
        print(f"❌ Ei löydy: {', '.join(errors)}")
        # Debug
        for label, old in [("state", OLD_STATE), ("load", OLD_LOAD), ("save", OLD_SAVE)]:
            idx = content.find(old[:30])
            if idx >= 0:
                print(f"   {label} löytyy osittain kohdasta {idx}: {repr(content[idx:idx+60])}")
        return False

    backup = FILE + '.backup_api_keys2'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_STATE, NEW_STATE)
    content = content.replace(OLD_LOAD, NEW_LOAD)
    content = content.replace(OLD_SAVE, NEW_SAVE)
    content = content.replace(OLD_UI, NEW_UI)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Tracerfy, BatchData ja Shodan API-avaimet lisätty!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
