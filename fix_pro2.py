content = open('src/utils/oneInputSearch.ts').read()

old = "    ...(isPro && wantedLinks.length > 0 ? [{"
new = "    ...(wantedLinks.length > 0 ? [{"

if old in content:
    content = content.replace(old, new)
    print("Pro gate 2 removed")
else:
    print("WARNING: text not found")

open('src/utils/oneInputSearch.ts', 'w').write(content)
print('Valmis!')
