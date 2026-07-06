content = open('App.tsx').read()

content = content.replace(
    """  // ── AppState / Biometric re-auth ─────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/active/) && nextState === 'background') {
        // App going to background – start lock timer
        appState.current = nextState;
      } else if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // App coming to foreground – require re-auth if session active
        appState.current = nextState;
        if (unlocked && !isAuthenticating.current) {
          setNeedsReauth(true);
          setUnlocked(false);
        }
      } else {
        appState.current = nextState;
      }
    });
    return () => sub.remove();
  }, [unlocked]);""",
    """  // ── AppState / Biometric re-auth ─────────────────────────────────────────
  // Temporarily disabled to debug Face ID loop issue"""
)

open('App.tsx', 'w').write(content)
print('Valmis!')
