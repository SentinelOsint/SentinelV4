content = open('src/utils/oneInputSearch.ts').read()

old_fbi = """    // FBI check
    try {
      const fbiRes = await fetch(`https://api.fbi.gov/wanted/v1/list?title=${enc}`);
      const fbiData = await fbiRes.json();
      const searchName = decodeURIComponent(enc).toLowerCase().trim();
      const fbiMatch = fbiData.items?.find((item: any) => {
        const title = (item.title || '').toLowerCase().trim();
        return title === searchName;
      });
      if (fbiMatch) {
        wantedLinks.push({ label: `🚨 FBI MATCH: ${fbiMatch.title}`, url: fbiMatch.url || 'https://www.fbi.gov/wanted' });
      } else {
        wantedLinks.push({ label: '✅ FBI Most Wanted – No match', url: 'https://www.fbi.gov/wanted' });
      }
    } catch {
      wantedLinks.push({ label: 'FBI Most Wanted', url: 'https://www.fbi.gov/wanted' });
    }"""

new_fbi = """    // FBI check
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

if old_fbi in content:
    content = content.replace(old_fbi, new_fbi)
    print("FBI fix applied")
else:
    print("WARNING: FBI fix not applied - text not found")

open('src/utils/oneInputSearch.ts', 'w').write(content)
print('Valmis!')
