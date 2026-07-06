#!/usr/bin/env python3
"""
Sentinel — Build 42: päivitetään buildNumber ja versionCode
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/app.json')

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    backup = FILE + '.backup_build42'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    changes = 0

    # buildNumber iOS
    if '"buildNumber": "30"' in content:
        content = content.replace('"buildNumber": "30"', '"buildNumber": "42"')
        changes += 1
        print("✅ iOS buildNumber: 30 → 42")

    # versionCode Android
    if '"versionCode": 5' in content:
        content = content.replace('"versionCode": 5', '"versionCode": 6')
        changes += 1
        print("✅ Android versionCode: 5 → 6")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✅ {changes} muutosta tehty!")
    print(f"📦 Backup: {backup}")

if __name__ == '__main__':
    patch()
