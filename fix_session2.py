content = open('src/utils/sessionManager.ts').read()

content = content.replace(
    '  private _handleAppStateChange(nextState: AppStateStatus): void {\n    if (nextState === \'background\' || nextState === \'inactive\') {\n      clearKeyMaterial();\n      if (this.timeoutHandle) clearTimeout(this.timeoutHandle);',
    '  private _handleAppStateChange(nextState: AppStateStatus): void {\n    if (nextState === \'background\' || nextState === \'inactive\') {\n      if (!this.isAuthenticating) clearKeyMaterial();\n      if (this.timeoutHandle) clearTimeout(this.timeoutHandle);'
)

open('src/utils/sessionManager.ts', 'w').write(content)
print('Valmis!')
