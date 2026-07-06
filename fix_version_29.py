#!/usr/bin/env python3
"""
Sentinel — Build 43: päivitetään versio 2.9.0 ja buildNumber 43
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/app.json')

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    backup = FILE + '.backup_v29'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    changes = 0

    replacements = [
        ('"version": "2.8.0"', '"version": "2.9.0"'),
        ('"buildNumber": "42"', '"buildNumber": "43"'),
        ('"versionCode": 6', '"versionCode": 7'),
    ]

    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            changes += 1
            print(f"✅ {old} → {new}")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✅ {changes} muutosta tehty!")
    print(f"📦 Backup: {backup}")

if __name__ == '__main__':
    patch()
