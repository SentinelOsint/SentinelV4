#!/usr/bin/env python3
"""
Sentinel — päivitetään AI-kyselyraja 100 → 500 kaikkialla
"""

import os

FILES = [
    os.path.expanduser('~/Downloads/SentinelV4/src/screens/UpgradeScreen.tsx'),
    os.path.expanduser('~/Downloads/SentinelV4/src/utils/aiEngine.ts'),
    os.path.expanduser('~/Downloads/SentinelV4/appstore_metadata.txt'),
]

REPLACEMENTS = [
    ('100 AI queries/month', '500 AI queries/month'),
    ('100-call soft cap', '500-call soft cap'),
    ('100 AI-kyselyä/kk', '500 AI-kyselyä/kk'),
]

def patch():
    for filepath in FILES:
        if not os.path.exists(filepath):
            print(f"⚠️  Ei löydy: {filepath}")
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        changes = 0
        for old, new in REPLACEMENTS:
            if old in content:
                content = content.replace(old, new)
                changes += 1

        if changes > 0:
            backup = filepath + '.backup_ai500'
            with open(backup, 'w', encoding='utf-8') as f:
                f.write(open(filepath, 'r', encoding='utf-8').read())

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"✅ {os.path.basename(filepath)} — {changes} muutosta tehty")
        else:
            print(f"⚠️  {os.path.basename(filepath)} — ei muutoksia tarvittu")

if __name__ == '__main__':
    patch()
