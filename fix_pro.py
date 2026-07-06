content = open('src/utils/oneInputSearch.ts').read()

old = """  // Wanted checks (Pro only)
  const wantedLinks: { label: string; url: string }[] = [];
  if (isPro) {"""

new = """  // Wanted checks (always run, Pro required to see full details)
  const wantedLinks: { label: string; url: string }[] = [];
  if (true) {"""

if old in content:
    content = content.replace(old, new)
    print("Pro gate removed")
else:
    print("WARNING: text not found")

open('src/utils/oneInputSearch.ts', 'w').write(content)
print('Valmis!')
