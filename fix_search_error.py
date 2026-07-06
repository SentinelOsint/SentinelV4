content = open('src/screens/OneInputScreen.tsx').read()

old = """  const handleSearch = async () => {
    if (!query.trim()) return;
    setAiSummary('');
    setRiskData(null);
    setSearched(true);
    setConfidence(0);
    setIsSearching(true);
    // Phase 1: Fast detection (immediate)
    setLoadingPhase('Detecting input type…');
    const partialResult = await buildOneInputResult(query.trim(), false);
    setResult(partialResult);
    setLoadingPhase('Running intelligence checks…');
    // Phase 2: Full search with Pro features
    const fullResult = await buildOneInputResult(query.trim(), isPro);
    setResult(fullResult);"""

new = """  const handleSearch = async () => {
    if (!query.trim()) return;
    setAiSummary('');
    setRiskData(null);
    setSearched(true);
    setConfidence(0);
    setIsSearching(true);
    try {
    // Phase 1: Fast detection (immediate)
    setLoadingPhase('Detecting input type…');
    const partialResult = await buildOneInputResult(query.trim(), false);
    setResult(partialResult);
    setLoadingPhase('Running intelligence checks…');
    // Phase 2: Full search with Pro features
    const fullResult = await buildOneInputResult(query.trim(), isPro);
    setResult(fullResult);"""

if old in content:
    content = content.replace(old, new)
    print("Fix 1 applied")
else:
    print("WARNING: Fix 1 not found")

# Lisätään catch-lohko ennen setLoadingPhase('') kohtaa
old2 = """    setLoadingPhase('');
    setIsSearching(false);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);"""

new2 = """    } catch (e: any) {
      console.error('Search error:', e);
      Alert.alert('Search Error', e.message || 'Search failed. Please try again.');
    }
    setLoadingPhase('');
    setIsSearching(false);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);"""

if old2 in content:
    content = content.replace(old2, new2)
    print("Fix 2 applied")
else:
    print("WARNING: Fix 2 not found")

open('src/screens/OneInputScreen.tsx', 'w').write(content)
print('Valmis!')
