content = open('src/utils/oneInputSearch.ts').read()

old = """  try {
    const res = await fetch(`https://phonevalidate.com/api?phone=${digits}&apikey=free`);
    const data = await res.json();
    if (data && data.country_code) {
      phoneAutoLinks.push({ label: `🌍 Country: ${data.country_name || data.country_code}`, url: `https://www.numlookup.com/?number=${enc}` });
      phoneAutoLinks.push({ label: `📡 Carrier: ${data.carrier || 'Unknown'}`, url: `https://www.numlookup.com/?number=${enc}` });
      phoneAutoLinks.push({ label: `📱 Type: ${data.line_type || 'Unknown'}`, url: `https://www.numlookup.com/?number=${enc}` });
      if (data.country_code === 'CA') {
        phoneAutoLinks.push({ label: '🍁 Canadian number detected', url: `https://www.numlookup.com/?number=${enc}` });
      } else if (data.country_code === 'US') {
        phoneAutoLinks.push({ label: '🇺🇸 US number detected', url: `https://www.numlookup.com/?number=${enc}` });
      }
    } else {
      // Fallback - detect from number format
      if (digits.startsWith('1') && digits.length === 11) {
        phoneAutoLinks.push({ label: '🌍 North American number (US/Canada)', url: `https://www.numlookup.com/?number=${enc}` });
      } else {
        phoneAutoLinks.push({ label: `📞 ${digits.length} digit number`, url: `https://www.numlookup.com/?number=${enc}` });
      }
    }
  } catch {
    phoneAutoLinks.push({ label: `📞 Number: ${q}`, url: `https://www.numlookup.com/?number=${enc}` });
  }"""

new = """  try {
    const res = await fetch(`https://ipapi.co/${digits}/json/`);
    const data = await res.json();
    if (data && !data.error) {
      phoneAutoLinks.push({ label: `🌍 Country: ${data.country_name || 'Unknown'}`, url: `https://www.numlookup.com/?number=${enc}` });
      phoneAutoLinks.push({ label: `📍 Region: ${data.region || 'Unknown'}`, url: `https://www.numlookup.com/?number=${enc}` });
    }
  } catch {}
  // Always add format detection
  if (digits.startsWith('1') && digits.length === 11) {
    phoneAutoLinks.push({ label: '🇺🇸🍁 North American number (US/Canada)', url: `https://www.numlookup.com/?number=${enc}` });
    phoneAutoLinks.push({ label: `📞 Number: +${digits}`, url: `https://www.numlookup.com/?number=${enc}` });
  } else {
    phoneAutoLinks.push({ label: `📞 Number: ${q}`, url: `https://www.numlookup.com/?number=${enc}` });
    phoneAutoLinks.push({ label: `📞 ${digits.length} digits detected`, url: `https://www.numlookup.com/?number=${enc}` });
  }"""

if old in content:
    content = content.replace(old, new)
    print("Phone fix applied")
else:
    print("WARNING: text not found")

open('src/utils/oneInputSearch.ts', 'w').write(content)
print('Valmis!')
