content = open('App.tsx').read()
content = content.replace(
    'onUnlock={() => { isAuthenticating.current = false; setUnlocked(true); setNeedsReauth(false); }}',
    'onUnlock={() => { isAuthenticating.current = false; setUnlocked(true); setNeedsReauth(false); }}\n   onAuthStart={() => { isAuthenticating.current = true; }}'
)
open('App.tsx', 'w').write(content)
print('Valmis!')
