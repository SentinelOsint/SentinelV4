content = open('src/screens/UpgradeScreen.tsx').read()
content = content.replace(
    '        products.forEach((p: any) => {',
    '        (products || []).forEach((p: any) => {'
)
open('src/screens/UpgradeScreen.tsx', 'w').write(content)
print('Valmis!')
