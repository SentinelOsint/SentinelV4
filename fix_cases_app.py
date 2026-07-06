content = open('App.tsx').read()
old = "if (screen === 'cases')    return wrapAnimated(<CasesScreen onBack={goHome} activeCaseId={activeCaseId} onSetActiveCase={handleSetActiveCase} />);"
new = "if (screen === 'cases')    return wrapAnimated(<CasesScreen onBack={goHome} activeCaseId={activeCaseId} onSetActiveCase={handleSetActiveCase} isPro={isPro} />);"

if old in content:
    content = content.replace(old, new)
    print("App.tsx fix applied")
else:
    print("WARNING: not found")

open('App.tsx', 'w').write(content)
print('Valmis!')
