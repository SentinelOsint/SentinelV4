#!/usr/bin/env python3
"""
Sentinel — Build 43: lisätään subtitle app.json:iin
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/app.json')

OLD = '''      "supportsTablet": true,
      "bundleIdentifier": "com.sentinel.osint",
      "buildNumber": "43",'''

NEW = '''      "supportsTablet": true,
      "bundleIdentifier": "com.sentinel.osint",
      "buildNumber": "43",
      "marketingVersion": "2.9.0",
      "subtitle": "Background Check, Skip Trace & AI",'''

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD not in content:
        print("❌ iOS-osiota ei löydy")
        return False

    if 'subtitle' in content:
        print("✅ Subtitle on jo lisätty")
        return True

    backup = FILE + '.backup_subtitle'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD, NEW)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Subtitle lisätty: 'Background Check, Skip Trace & AI'")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
