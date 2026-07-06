content = open('app.json').read()
content = content.replace('      "react-native-iap",\n', '')
open('app.json', 'w').write(content)
print('Valmis!')
