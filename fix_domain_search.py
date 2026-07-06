content = open('App.tsx').read()

old = "  const searchDomain  = () => run('Domain & WHOIS',  input, async () => { const q = input.trim().replace(/^https?:\\/\\//,'').split('/')[0]; const r = await fetch(`https://ipapi.co/${q}/json/`); const d = await r.json(); return getDomainResults(q, d); });"

new = "  const searchDomain  = () => run('Domain & WHOIS',  input, async () => { const q = input.trim().replace(/^https?:\\/\\//,'').split('/')[0]; const r = await fetch(`https://dns.google/resolve?name=${q}&type=A`); const d = await r.json(); const ip = d.Answer?.[0]?.data || ''; const ipData = ip ? await fetch(`https://ipapi.co/${ip}/json/`).then(r => r.json()).catch(() => ({})) : {}; return getDomainResults(q, ipData); });"

if old in content:
    content = content.replace(old, new)
    print("Domain fix applied")
else:
    print("WARNING: text not found")

open('App.tsx', 'w').write(content)
print('Valmis!')
