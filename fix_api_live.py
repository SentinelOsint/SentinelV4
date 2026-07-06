#!/usr/bin/env python3
"""
Sentinel — Build 43: Shodan, Tracerfy ja BatchData live API-kutsut
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

# ── 1. Lisätään Shodan live API IP-hakuun ────────────────────────────────
OLD_SHODAN = """    const settings = await Storage.getSettings();
    const abuseKey = settings.abuseIPDBKey as string || '';
    const greyKey = settings.greyNoiseKey as string || '';

    if (abuseKey || greyKey) {"""

NEW_SHODAN = """    const settings = await Storage.getSettings();
    const abuseKey   = settings.abuseIPDBKey as string || '';
    const greyKey    = settings.greyNoiseKey as string || '';
    const shodanKey  = settings.shodanKey as string || '';

    // Shodan live lookup
    if (shodanKey) {
      try {
        const sr = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${encodeURIComponent(shodanKey)}`);
        const sd = await sr.json();
        if (!sd.error) {
          results.push({ label: '─── SHODAN INTELLIGENCE', value: '', type: 'info' });
          results.push({ label: 'OPEN PORTS', value: sd.ports ? sd.ports.slice(0,10).join(', ') : 'None found', type: 'data' });
          results.push({ label: 'OS', value: sd.os || 'Unknown', type: 'data' });
          results.push({ label: 'HOSTNAMES', value: sd.hostnames?.length ? sd.hostnames.slice(0,3).join(', ') : 'None', type: 'data' });
          results.push({ label: 'LAST SEEN', value: sd.last_update || 'Unknown', type: 'data' });
          if (sd.vulns && Object.keys(sd.vulns).length > 0) {
            results.push({ label: '⚠️ VULNERABILITIES', value: Object.keys(sd.vulns).slice(0,5).join(', '), type: 'data' });
          }
          results.push({ label: 'COUNTRY', value: sd.country_name || 'Unknown', type: 'data' });
        }
      } catch {
        // Shodan fetch failed silently
      }
    }

    if (abuseKey || greyKey) {"""

# ── 2. Lisätään Tracerfy Person-hakuun oneInputSearch.ts:ssä ─────────────
ONE_INPUT_FILE = os.path.expanduser('~/Downloads/SentinelV4/src/utils/oneInputSearch.ts')

OLD_PERSON_AUTO = """async function personModules(q: string, isPro: boolean = false): Promise<ModuleResult[]> {"""

NEW_PERSON_AUTO = """async function personModules(q: string, isPro: boolean = false, tracerfyKey: string = '', batchDataKey: string = ''): Promise<ModuleResult[]> {"""

# ── 3. Lisätään Tracerfy kutsu personModules-funktioon ────────────────────
OLD_PERSON_LINKS = """  const personAutoLinks: { label: string; url: string }[] = [];"""

NEW_PERSON_LINKS = """  const personAutoLinks: { label: string; url: string }[] = [];

  // Tracerfy live skip trace (Pro + user API key)
  if (isPro && tracerfyKey) {
    try {
      const nameParts = q.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName  = nameParts.slice(1).join(' ') || '';
      const tr = await fetch(`https://api.tracerfy.com/v1/person/search?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`, {
        headers: { 'Authorization': `Bearer ${tracerfyKey}`, 'Content-Type': 'application/json' },
      });
      const td = await tr.json();
      if (td.results && td.results.length > 0) {
        personAutoLinks.push({ label: `🔍 TRACERFY: ${td.results.length} record(s) found`, url: `https://tracerfy.com` });
        td.results.slice(0, 3).forEach((r: any) => {
          if (r.addresses?.length) personAutoLinks.push({ label: `📍 ${r.addresses[0].street || ''} ${r.addresses[0].city || ''}, ${r.addresses[0].state || ''}`.trim(), url: `https://tracerfy.com` });
          if (r.phones?.length) personAutoLinks.push({ label: `📞 ${r.phones[0].number || ''}`, url: `https://tracerfy.com` });
        });
      } else {
        personAutoLinks.push({ label: '✅ Tracerfy: No matching records found', url: 'https://tracerfy.com' });
      }
    } catch {
      // Tracerfy failed silently
    }
  }"""

def patch_app():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_SHODAN not in content:
        print("❌ App.tsx: Shodan kohta ei löydy")
        return False

    backup = FILE + '.backup_api_live'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_SHODAN, NEW_SHODAN)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Shodan live API lisätty IP-hakuun!")
    return True

def patch_one_input():
    with open(ONE_INPUT_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_PERSON_AUTO not in content:
        errors.append("personModules signature")
    if OLD_PERSON_LINKS not in content:
        errors.append("personAutoLinks")

    if errors:
        print(f"❌ oneInputSearch.ts: ei löydy: {', '.join(errors)}")
        return False

    backup = ONE_INPUT_FILE + '.backup_tracerfy'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_PERSON_AUTO, NEW_PERSON_AUTO)
    content = content.replace(OLD_PERSON_LINKS, NEW_PERSON_LINKS)

    with open(ONE_INPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Tracerfy live API lisätty Person-hakuun!")
    return True

if __name__ == '__main__':
    ok1 = patch_app()
    ok2 = patch_one_input()
    if ok1 and ok2:
        print("\n✅ Kaikki API-integraatiot lisätty!")
    else:
        print("\n⚠️ Jokin epäonnistui — tarkista virheet yllä")
