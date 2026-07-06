content = open('src/utils/oneInputSearch.ts').read()

# FBI fix - hae suoraan "fisher" tyylisellä viimeisellä nimellä ensin
old_fbi = """    // FBI check
    try {
      const searchName = q.toLowerCase().trim();
      const nameParts = searchName.split(' ').filter((p: string) => p.length > 1);
      let fbiMatch: any = null;
      for (const part of nameParts) {
        const fbiRes = await fetch(`https://api.fbi.gov/wanted/v1/list?title=${encodeURIComponent(part)}&pageSize=50`);
        const fbiData = await fbiRes.json();
        const match = fbiData.items?.find((item: any) => {
          const title = (item.title || '').toLowerCase().trim();
          return nameParts.every((p: string) => title.includes(p));
        });
        if (match) { fbiMatch = match; break; }
      }
      if (fbiMatch) {
        wantedLinks.push({ label: `🚨 FBI MATCH: ${fbiMatch.title}`, url: fbiMatch.url || 'https://www.fbi.gov/wanted' });
      } else {
        wantedLinks.push({ label: '✅ FBI Most Wanted – No match', url: 'https://www.fbi.gov/wanted' });
      }
    } catch {
      wantedLinks.push({ label: 'FBI Most Wanted', url: 'https://www.fbi.gov/wanted' });
    }"""

new_fbi = """    // FBI check — search by last name first (most specific), then verify all parts match
    try {
      const searchName = q.toLowerCase().trim();
      const nameParts = searchName.split(' ').filter((p: string) => p.length > 1);
      const lastName = nameParts[nameParts.length - 1];
      const fbiRes = await fetch(`https://api.fbi.gov/wanted/v1/list?title=${encodeURIComponent(lastName)}&pageSize=50`);
      const fbiData = await fbiRes.json();
      const fbiMatch = fbiData.items?.find((item: any) => {
        const title = (item.title || '').toLowerCase().trim();
        return nameParts.every((p: string) => title.includes(p));
      });
      if (fbiMatch) {
        wantedLinks.push({ label: `🚨 FBI MATCH: ${fbiMatch.title}`, url: fbiMatch.url || 'https://www.fbi.gov/wanted' });
      } else {
        wantedLinks.push({ label: '✅ FBI Most Wanted – No match', url: 'https://www.fbi.gov/wanted' });
      }
    } catch {
      wantedLinks.push({ label: 'FBI Most Wanted', url: 'https://www.fbi.gov/wanted' });
    }"""

if old_fbi in content:
    content = content.replace(old_fbi, new_fbi)
    print("FBI fix applied")
else:
    print("WARNING: FBI fix not found")

# IP fix - lisää timeout ja parempi virheenkäsittely
old_ip = """  try {
    const res = await fetch(`https://ipapi.co/${enc}/json/`);
    const data = await res.json();
    if (data && data.ip && !data.error) {
      ipAutoLinks.push({ label: `📍 ${data.city || '?'}, ${data.region || '?'}, ${data.country_name || '?'}`, url: `https://ipapi.co/${enc}/json/` });
      ipAutoLinks.push({ label: `🏢 ISP: ${data.org || 'Unknown'}`, url: `https://ipapi.co/${enc}/json/` });
      ipAutoLinks.push({ label: `🌐 ASN: ${data.asn || 'Unknown'}`, url: `https://ipapi.co/${enc}/json/` });
      if (data.timezone) ipAutoLinks.push({ label: `🕐 Timezone: ${data.timezone}`, url: `https://ipapi.co/${enc}/json/` });
    } else {
      ipAutoLinks.push({ label: '⚠️ Could not resolve IP data', url: `https://ipapi.co/${enc}/json/` });
    }
  } catch {
    ipAutoLinks.push({ label: 'IP Lookup failed', url: `https://ipapi.co/${enc}/json/` });
  }"""

new_ip = """  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://ipapi.co/${enc}/json/`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data && data.ip && !data.error) {
      ipAutoLinks.push({ label: `📍 ${data.city || '?'}, ${data.region || '?'}, ${data.country_name || '?'}`, url: `https://ipapi.co/${enc}/json/` });
      ipAutoLinks.push({ label: `🏢 ISP: ${data.org || 'Unknown'}`, url: `https://ipapi.co/${enc}/json/` });
      ipAutoLinks.push({ label: `🌐 ASN: ${data.asn || 'Unknown'}`, url: `https://ipapi.co/${enc}/json/` });
      if (data.timezone) ipAutoLinks.push({ label: `🕐 Timezone: ${data.timezone}`, url: `https://ipapi.co/${enc}/json/` });
    } else {
      ipAutoLinks.push({ label: `🌐 IP: ${q}`, url: `https://ipinfo.io/${enc}` });
      ipAutoLinks.push({ label: '🔍 IPinfo lookup', url: `https://ipinfo.io/${enc}` });
    }
  } catch {
    ipAutoLinks.push({ label: `🌐 IP: ${q}`, url: `https://ipinfo.io/${enc}` });
    ipAutoLinks.push({ label: '🔍 IPinfo lookup', url: `https://ipinfo.io/${enc}` });
    ipAutoLinks.push({ label: '🛡️ AbuseIPDB', url: `https://www.abuseipdb.com/check/${enc}` });
  }"""

if old_ip in content:
    content = content.replace(old_ip, new_ip)
    print("IP fix applied")
else:
    print("WARNING: IP fix not found")

open('src/utils/oneInputSearch.ts', 'w').write(content)
print('Valmis!')
