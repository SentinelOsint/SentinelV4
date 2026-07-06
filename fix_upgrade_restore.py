content = open('src/screens/UpgradeScreen.tsx').read()
content = content.replace(
    '  restorePurchases, PRODUCT_IDS,',
    '  restorePurchasesIAP, PRODUCT_IDS,'
)
content = content.replace(
    '  await restorePurchases(',
    '  await restorePurchasesIAP('
)
open('src/screens/UpgradeScreen.tsx', 'w').write(content)
print('Valmis!')
