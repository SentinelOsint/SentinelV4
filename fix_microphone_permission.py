#!/usr/bin/env python3
"""
Sentinel — Lisätään mikrofoni ja puheentunnistus käyttöoikeudet app.json:iin
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/app.json')

OLD_INFOPLIST = '        "NSFaceIDUsageDescription": "Sentinel uses Face ID to protect your investigative data.",'
NEW_INFOPLIST = '''        "NSFaceIDUsageDescription": "Sentinel uses Face ID to protect your investigative data.",
        "NSMicrophoneUsageDescription": "Sentinel uses the microphone for voice dictation in Case Intake to allow hands-free data entry during client meetings.",
        "NSSpeechRecognitionUsageDescription": "Sentinel uses speech recognition to transcribe spoken subject information during client intake sessions.",'''

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_INFOPLIST not in content:
        print("❌ NSFaceIDUsageDescription ei löydy")
        return False

    if 'NSMicrophoneUsageDescription' in content:
        print("✅ Mikrofoni-käyttöoikeus on jo lisätty")
        return True

    backup = FILE + '.backup_microphone'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_INFOPLIST, NEW_INFOPLIST)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Mikrofoni ja puheentunnistus käyttöoikeudet lisätty!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
