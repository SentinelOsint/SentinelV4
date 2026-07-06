#!/usr/bin/env python3
"""
Sentinel — Build 42: FamilySearch
Lisää FamilySearch ja genealogia-lähteet personModules-funktioon
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/utils/oneInputSearch.ts')

OLD_PUBLIC_RECORDS_END = """        { label: 'Canada411 People', url: `https://www.canada411.ca/search/?stype=si&fn=${enc}&ln=` },
        { label: 'Canada White Pages', url: `https://www.canada411.ca/search/?stype=si&fn=${enc}` },
      ],
    },
    {
      module: '🚔 Federal Wanted (USA)', icon: '🚔',"""

NEW_PUBLIC_RECORDS_END = """        { label: 'Canada411 People', url: `https://www.canada411.ca/search/?stype=si&fn=${enc}&ln=` },
        { label: 'Canada White Pages', url: `https://www.canada411.ca/search/?stype=si&fn=${enc}` },
      ],
    },
    {
      module: '🌳 Genealogy & Historical Records', icon: '🌳',
      links: [
        { label: 'FamilySearch — Person Search', url: `https://www.familysearch.org/search/record/results?q.givenName=${enc}&q.surname=` },
        { label: 'FamilySearch — Family Tree', url: `https://www.familysearch.org/search/tree/results?q.givenName=${enc}` },
        { label: 'FamilySearch — Historical Records', url: `https://www.familysearch.org/search/record/results?q.anyName=${enc}` },
        { label: 'Ancestry — Search', url: `https://www.ancestry.com/search/?name=${enc}` },
        { label: 'FindAGrave', url: `https://www.findagrave.com/memorial/search?lastname=${enc}` },
        { label: 'Fold3 — Military Records', url: `https://www.fold3.com/search#query=${enc}` },
        { label: 'Newspapers.com — Historical', url: `https://www.newspapers.com/search/#query=${enc}` },
        { label: 'MyHeritage — Search', url: `https://www.myheritage.com/research/search/results?q.first_name=${enc}` },
      ],
    },
    {
      module: '🚔 Federal Wanted (USA)', icon: '🚔',"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_PUBLIC_RECORDS_END not in content:
        print("❌ Public Records -moduulin loppua ei löydy")
        return False

    backup = FILE + '.backup_familysearch'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_PUBLIC_RECORDS_END, NEW_PUBLIC_RECORDS_END)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ FamilySearch + genealogia-lähteet lisätty personModules-funktioon!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
