content = open('src/utils/oneInputSearch.ts').read()

old = 'agency|holdco|realty|properties|ventures|capital|fund|trust|bank|financial)'
new = 'agency|holdco|realty|properties|ventures|capital|fund|trust|bank|financial|corporation|limited|management|consulting)'

if old in content:
    content = content.replace(old, new)
    print("Fix applied")
else:
    print("WARNING: text not found")

open('src/utils/oneInputSearch.ts', 'w').write(content)
print('Valmis!')
