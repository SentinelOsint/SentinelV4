#!/usr/bin/env python3
import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

OLD = "  const [isPro,         setIsPro]         = useState(true);"
NEW = "  const [isPro,         setIsPro]         = useState(false);"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

if OLD in content:
    content = content.replace(OLD, NEW)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ useState(isPro) palautettu falseksi")
else:
    print("❌ Ei löydy")
