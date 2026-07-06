content = open('src/utils/sessionManager.ts').read()

content = content.replace(
    '  private shakeEnabled:   boolean  = true;',
    '  private shakeEnabled:   boolean  = true;\n  private isAuthenticating: boolean = false;'
)

content = content.replace(
    '  setShakeToLock(enabled: boolean): void { this.shakeEnabled = enabled; }\n  getShakeEnabled(): boolean { return this.shakeEnabled; }',
    '  setShakeToLock(enabled: boolean): void { this.shakeEnabled = enabled; }\n  getShakeEnabled(): boolean { return this.shakeEnabled; }\n  setAuthenticating(val: boolean): void { this.isAuthenticating = val; }'
)

content = content.replace(
    '  } else if (nextState === \'active\') {\n      if (!isSessionActive()) {\n        if (this.onLockCallback) this.onLockCallback();\n      } else {\n        this.touch();\n      }\n    }',
    '  } else if (nextState === \'active\') {\n      if (!isSessionActive() && !this.isAuthenticating) {\n        if (this.onLockCallback) this.onLockCallback();\n      } else {\n        this.touch();\n      }\n    }'
)

open('src/utils/sessionManager.ts', 'w').write(content)
print('Valmis!')
