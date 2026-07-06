content = open('src/utils/osintEngines.ts').read()

# Korjaus 1: wantedResults näytetään aina
old1 = "    ...(isPro ? wantedResults : []),"
new1 = "    ...wantedResults,"

# Korjaus 2: wanted-listat näytetään aina
old2 = "    ...((isPro ? ["
new2 = "    ...(["

if old1 in content:
    content = content.replace(old1, new1)
    print("Fix 1 applied")
else:
    print("WARNING: Fix 1 not found")

if old2 in content:
    content = content.replace(old2, new2)
    print("Fix 2 applied")
else:
    print("WARNING: Fix 2 not found")

open('src/utils/osintEngines.ts', 'w').write(content)
print('Valmis!')
