#!/usr/bin/env python3
"""
Sentinel — TEST MODE: pakottaa isPro=true testausta varten
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

OLD = "      setIsPro(tier === 'pro');"
NEW = "      setIsPro(true); // TEST MODE — muista palauttaa: setIsPro(tier === 'pro');"

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD not in content:
        print("❌ Riviä ei löydy")
        return False

    backup = FILE + '.backup_testmode'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD, NEW)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ TEST MODE aktivoitu — isPro=true")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
