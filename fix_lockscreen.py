content = open('src/screens/LockScreen.tsx').read()
content = content.replace(
    'interface Props {\n  onUnlock: () => void;\n  isReauth?: boolean;   // true = session timed out, not first launch\n}',
    'interface Props {\n  onUnlock: () => void;\n  onAuthStart?: () => void;\n  isReauth?: boolean;   // true = session timed out, not first launch\n}'
)
content = content.replace(
    'export default function LockScreen({ onUnlock, isReauth = false }: Props) {',
    'export default function LockScreen({ onUnlock, onAuthStart, isReauth = false }: Props) {'
)
content = content.replace(
    'const authenticate = async () => {\n    setLockState(\'authenticating\');',
    'const authenticate = async () => {\n    if (onAuthStart) onAuthStart();\n    setLockState(\'authenticating\');'
)
open('src/screens/LockScreen.tsx', 'w').write(content)
print('Valmis!')
