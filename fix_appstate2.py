content = open('App.tsx').read()

content = content.replace(
    """  // ── AppState / Biometric re-auth ─────────────────────────────────────────
  // Temporarily disabled to debug Face ID loop issue""",
    """  // ── AppState / Biometric re-auth ─────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') {
        // Only lock when truly backgrounded, not on inactive (Face ID dialog)
        appState.current = nextState;
        if (unlocked && !isAuthenticating.current) {
          setNeedsReauth(true);
          setUnlocked(false);
        }
      } else if (nextState === 'active') {
        appState.current = nextState;
      } else {
        // inactive – do nothing, Face ID/passcode dialogs cause this
        appState.current = nextState;
      }
    });
    return () => sub.remove();
  }, [unlocked]);"""
)

open('App.tsx', 'w').write(content)
print('Valmis!')
