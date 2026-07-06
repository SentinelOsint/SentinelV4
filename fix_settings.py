content = open('src/screens/SettingsScreen.tsx').read()

old = "  View, Text, TouchableOpacity, ScrollView, StyleSheet,\n  SafeAreaView, StatusBar, Alert, Modal, Share, Switch,"
new = "  View, Text, TouchableOpacity, ScrollView, StyleSheet,\n  SafeAreaView, StatusBar, Alert, Modal, Share,"

if old in content:
    content = content.replace(old, new)
    print("Switch removed")
else:
    print("WARNING: Switch not found")

old2 = "import { C, IS_IPAD, SPACE } from '../utils/theme';"
new2 = "import { C, IS_IPAD } from '../utils/theme';"

if old2 in content:
    content = content.replace(old2, new2)
    print("SPACE removed")
else:
    print("WARNING: SPACE not found")

open('src/screens/SettingsScreen.tsx', 'w').write(content)
print('Valmis!')
