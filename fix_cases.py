content = open('src/screens/CasesScreen.tsx').read()

# Lisätään isPro prop
old_props = """interface Props {
  onBack: () => void;
  activeCaseId: string | null;
  onSetActiveCase: (id: string | null) => void;
}"""

new_props = """interface Props {
  onBack: () => void;
  activeCaseId: string | null;
  onSetActiveCase: (id: string | null) => void;
  isPro?: boolean;
}"""

if old_props in content:
    content = content.replace(old_props, new_props)
    print("Props fix applied")
else:
    print("WARNING: Props fix not found")

# Lisätään isPro destrukturointi
old_destruct = "export default function CasesScreen({ onBack, activeCaseId, onSetActiveCase }: Props) {"
new_destruct = "export default function CasesScreen({ onBack, activeCaseId, onSetActiveCase, isPro = false }: Props) {"

if old_destruct in content:
    content = content.replace(old_destruct, new_destruct)
    print("Destruct fix applied")
else:
    print("WARNING: Destruct fix not found")

# Lisätään isPro-tarkistus AI Report -nappiin
old_ai_report = """            style={[s.actionBtn, { backgroundColor: '#1a0a2e', borderColor: '#a855f7' }]}
            onPress={() => setAiScreen({
              mode: 'report',
              title: selectedCase.title,
              fetch: () => generateCaseReport(selectedCase),
            })}"""

new_ai_report = """            style={[s.actionBtn, { backgroundColor: '#1a0a2e', borderColor: '#a855f7' }]}
            onPress={() => {
              if (!isPro) { Alert.alert('Pro Feature', 'AI Report requires a Pro subscription.'); return; }
              setAiScreen({ mode: 'report', title: selectedCase.title, fetch: () => generateCaseReport(selectedCase) });
            }}"""

if old_ai_report in content:
    content = content.replace(old_ai_report, new_ai_report)
    print("AI Report pro gate applied")
else:
    print("WARNING: AI Report gate not found")

# Lisätään isPro-tarkistus PDF exportiin
old_pdf = """  const exportPDF = async () => {
    if (!selectedCase) return;
    setExporting(true);
    try { await exportCasePDF(selectedCase); }
    catch { Alert.alert('Export Failed', 'Could not generate PDF. Ensure expo-print is installed.'); }
    setExporting(false);
  };"""

new_pdf = """  const exportPDF = async () => {
    if (!selectedCase) return;
    if (!isPro) { Alert.alert('Pro Feature', 'PDF export requires a Pro subscription.'); return; }
    setExporting(true);
    try { await exportCasePDF(selectedCase); }
    catch { Alert.alert('Export Failed', 'Could not generate PDF. Ensure expo-print is installed.'); }
    setExporting(false);
  };"""

if old_pdf in content:
    content = content.replace(old_pdf, new_pdf)
    print("PDF pro gate applied")
else:
    print("WARNING: PDF gate not found")

open('src/screens/CasesScreen.tsx', 'w').write(content)
print('Valmis!')
