content = open('App.tsx').read()

content = content.replace(
    'onAuthStart={() => { isAuthenticating.current = true; }}',
    'onAuthStart={() => { isAuthenticating.current = true; SessionManager.setAuthenticating(true); }}'
)

content = content.replace(
    'onUnlock={() => { isAuthenticating.current = false; setUnlocked(true); setNeedsReauth(false); }}',
    'onUnlock={() => { isAuthenticating.current = false; SessionManager.setAuthenticating(false); setUnlocked(true); setNeedsReauth(false); }}'
)

open('App.tsx', 'w').write(content)
print('Valmis!')
