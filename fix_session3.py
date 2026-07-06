content = open('src/utils/sessionManager.ts').read()

content = content.replace(
    "this.appStateListener = AppState.addEventListener('change', this._handleAppStateChange.bind(this));",
    "// AppState handled by App.tsx to avoid conflicts with biometric auth\n    // this.appStateListener = AppState.addEventListener('change', this._handleAppStateChange.bind(this));"
)

open('src/utils/sessionManager.ts', 'w').write(content)
print('Valmis!')
