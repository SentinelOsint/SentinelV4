content = open('src/utils/osintEngines.ts').read()

old = "    ] : []) as OsintResult[]),"
new = "    ] as OsintResult[]),"

if old in content:
    content = content.replace(old, new)
    print("Fix applied")
else:
    print("WARNING: text not found")

open('src/utils/osintEngines.ts', 'w').write(content)
print('Valmis!')
