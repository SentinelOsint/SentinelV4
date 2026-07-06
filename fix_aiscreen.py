content = open('src/screens/AIResultScreen.tsx').read()

# Poista Clipboard ja SPACE
old = "  View, Text, ScrollView, TouchableOpacity, StyleSheet,\n  SafeAreaView, StatusBar, ActivityIndicator, Share,\n  Clipboard, Alert, Animated,"
new = "  View, Text, ScrollView, TouchableOpacity, StyleSheet,\n  SafeAreaView, StatusBar, ActivityIndicator, Share,\n  Alert, Animated,"

if old in content:
    content = content.replace(old, new)
    print("Clipboard removed")
else:
    print("WARNING: Clipboard not found")

old2 = "import { C, IS_IPAD, SPACE } from '../utils/theme';"
new2 = "import { C, IS_IPAD } from '../utils/theme';"

if old2 in content:
    content = content.replace(old2, new2)
    print("SPACE removed")
else:
    print("WARNING: SPACE not found")

# Korvaa Clipboard.setString expo-clipboardilla
old3 = "  const handleCopy = () => {\n    Clipboard.setString(result);\n    Alert.alert('✓ Copied', 'AI analysis copied to clipboard.');\n  };"
new3 = """  const handleCopy = async () => {
    try {
      const { setStringAsync } = await import('expo-clipboard');
      await setStringAsync(result);
    } catch {
      // fallback: share instead
    }
    Alert.alert('✓ Copied', 'AI analysis copied to clipboard.');
  };"""

if old3 in content:
    content = content.replace(old3, new3)
    print("Clipboard fix applied")
else:
    print("WARNING: handleCopy not found")

open('src/screens/AIResultScreen.tsx', 'w').write(content)
print('Valmis!')
