content = open('app.json').read()
old = '    "plugins": [\n      "expo-local-authentication",'
new = '    "plugins": [\n      "expo-local-authentication",\n      "react-native-iap",'
if old in content:
    content = content.replace(old, new)
    print("Plugin added")
else:
    print("WARNING: not found")
open('app.json', 'w').write(content)
print('Valmis!')
