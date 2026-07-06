content = open('src/screens/AIResultScreen.tsx').read()

old = """  const handleCopy = async () => {
    try {
      const { setStringAsync } = await import('expo-clipboard');
      await setStringAsync(result);
    } catch {
      // fallback: share instead
    }
    Alert.alert('✓ Copied', 'AI analysis copied to clipboard.');
  };"""

new = """  const handleCopy = () => {
    try {
      const { Clipboard } = require('react-native');
      Clipboard.setString(result);
    } catch {}
    Alert.alert('✓ Copied', 'AI analysis copied to clipboard.');
  };"""

if old in content:
    content = content.replace(old, new)
    print("Fix applied")
else:
    print("WARNING: not found")

open('src/screens/AIResultScreen.tsx', 'w').write(content)
print('Valmis!')
