content = open('src/utils/watchList.ts').read()

# Korjaus 1: checkDomain käyttää dns.google eikä ipinfo
old_domain = """async function checkDomain(item: WatchItem): Promise<string | null> {
  try {
    const res = await fetch(`https://ipinfo.io/${item.value}/json`);
    const data = await res.json();
    const result = JSON.stringify({ org: data.org, country: data.country });
    if (item.lastResult && item.lastResult !== result) return `Domain intel changed for ${item.value}`;
    return result;
  } catch { return null; }
}"""

new_domain = """async function checkDomain(item: WatchItem): Promise<string | null> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(item.value)}&type=A`);
    const data = await res.json();
    const ips = (data.Answer || []).map((a: any) => a.data).join(',');
    const result = JSON.stringify({ ips });
    if (item.lastResult && item.lastResult !== result) return `DNS records changed for ${item.value}`;
    return result;
  } catch { return null; }
}"""

if old_domain in content:
    content = content.replace(old_domain, new_domain)
    print("Domain fix applied")
else:
    print("WARNING: domain fix not found")

# Korjaus 2: lisää person ja phone default-haaraan selkeä viesti
old_default = """    default:
      newResult = item.lastResult || 'monitored';"""

new_default = """    case 'person':
    case 'phone':
      // Person and phone monitoring uses manual check reminder
      newResult = item.lastResult || 'monitoring-active';
      break;
    default:
      newResult = item.lastResult || 'monitored';"""

if old_default in content:
    content = content.replace(old_default, new_default)
    print("Person/phone fix applied")
else:
    print("WARNING: person/phone fix not found")

open('src/utils/watchList.ts', 'w').write(content)
print('Valmis!')
