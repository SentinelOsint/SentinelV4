#!/usr/bin/env python3
"""
Sentinel — Poistetaan @react-native-voice/voice app.json:sta
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/app.json')

OLD = '      "@react-native-voice/voice"\n    ],'
NEW = '    ],'

OLD2 = '      "@react-native-voice/voice",\n'
NEW2 = ''

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    backup = FILE + '.backup_remove_voice'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    if OLD in content:
        content = content.replace(OLD, NEW)
        print("✅ @react-native-voice/voice poistettu app.json:sta")
    elif OLD2 in content:
        content = content.replace(OLD2, NEW2)
        print("✅ @react-native-voice/voice poistettu app.json:sta")
    else:
        print("❌ Ei löydy — tarkista manuaalisesti")
        return False

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
