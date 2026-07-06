# Korjaa types/index.ts duplikaatti
content = open('src/types/index.ts').read()
old = "  | 'timeline' | 'upgrade' | 'watchlist' | 'one_input' | 'settings' | 'geo_map';"
new = "  | 'timeline' | 'upgrade' | 'watchlist' | 'one_input' | 'settings';"
if old in content:
    content = content.replace(old, new)
    print("Duplicate geo_map removed")
else:
    print("WARNING: not found")
open('src/types/index.ts', 'w').write(content)

# Korjaa MapScreen SPACE import
content2 = open('src/screens/MapScreen.tsx').read()
old2 = "import { C, IS_IPAD, SPACE } from '../utils/theme';"
new2 = "import { C, IS_IPAD } from '../utils/theme';"
if old2 in content2:
    content2 = content2.replace(old2, new2)
    print("SPACE removed from MapScreen")
else:
    print("WARNING: SPACE not found")
open('src/screens/MapScreen.tsx', 'w').write(content2)
print('Valmis!')
