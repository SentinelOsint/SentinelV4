#!/usr/bin/env python3
"""
Sentinel — Palauttaa isPro normaalitilaan TEST MODEsta
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

OLD = "      setIsPro(true); // TEST MODE — muista palauttaa: setIsPro(tier === 'pro');"
NEW = "      setIsPro(tier === 'pro');"

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD not in content:
        print("❌ TEST MODE riviä ei löydy — ehkä jo palautettu?")
        return False

    content = content.replace(OLD, NEW)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ isPro palautettu normaalitilaan")
    return True

if __name__ == '__main__':
    patch()
