content = open('src/utils/sessionManager.ts').read()

content = content.replace(
    '  private _handleAppStateChange(nextState: AppStateStatus): void {\n    if (nextState === \'background\' || nextState === \'inactive\') {\n      if (!this.isAuthenticating) clearKeyMaterial();\n      if (this.timeoutHandle) clearTimeout(this.timeoutHandle);',
    '  private _handleAppStateChange(nextState: AppStateStatus): void {\n    console.log("[SESSION] AppState changed to:", nextState, "isAuthenticating:", this.isAuthenticating);\n    if (nextState === \'background\' || nextState === \'inactive\') {\n      if (!this.isAuthenticating) clearKeyMaterial();\n      if (this.timeoutHandle) clearTimeout(this.timeoutHandle);'
)

content = content.replace(
    '  } else if (nextState === \'active\') {\n      if (!isSessionActive() && !this.isAuthenticating) {\n        if (this.onLockCallback) this.onLockCallback();\n      } else {\n        this.touch();\n      }\n    }',
    '  } else if (nextState === \'active\') {\n      console.log("[SESSION] Returning to active, isSessionActive:", isSessionActive(), "isAuthenticating:", this.isAuthenticating);\n      if (!isSessionActive() && !this.isAuthenticating) {\n        console.log("[SESSION] Triggering lock callback");\n        if (this.onLockCallback) this.onLockCallback();\n      } else {\n        this.touch();\n      }\n    }'
)

open('src/utils/sessionManager.ts', 'w').write(content)
print('Valmis!')
