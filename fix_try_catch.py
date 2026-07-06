content = open('src/screens/OneInputScreen.tsx').read()

old = """    setConfidence(Math.min(baseScore + bonusScore, 99));
    } catch (e: any) {
      console.error('Search error:', e);
      Alert.alert('Search Error', e.message || 'Search failed. Please try again.');
    }
    setLoadingPhase('');
    setIsSearching(false);"""

new = """    setConfidence(Math.min(baseScore + bonusScore, 99));
    setLoadingPhase('');
    setIsSearching(false);"""

if old in content:
    content = content.replace(old, new)
    print("Fix applied")
else:
    print("WARNING: text not found")

open('src/screens/OneInputScreen.tsx', 'w').write(content)
print('Valmis!')
