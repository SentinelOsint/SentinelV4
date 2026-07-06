content = open('src/screens/WatchListScreen.tsx').read()

old = """  const handleAdd = async () => {
    if (!label.trim() || !value.trim()) {
      Alert.alert('Missing Info', 'Please enter both a label and a value.');
      return;
    }"""

new = """  const handleAdd = async () => {
    if (!isPro) {
      Alert.alert('Pro Feature', 'Watch List monitoring requires a Pro subscription.');
      return;
    }
    if (!label.trim() || !value.trim()) {
      Alert.alert('Missing Info', 'Please enter both a label and a value.');
      return;
    }"""

if old in content:
    content = content.replace(old, new)
    print("Pro gate applied")
else:
    print("WARNING: pro gate not found")

open('src/screens/WatchListScreen.tsx', 'w').write(content)
print('Valmis!')
