content = open('src/screens/TimelineScreen.tsx').read()

old = """function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return iso.slice(11, 16); }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso.slice(0, 10); }
}"""

new = """function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp.slice(0, 8);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
}

function formatDate(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return timestamp; }
}"""

if old in content:
    content = content.replace(old, new)
    print("formatTime/formatDate fix applied")
else:
    print("WARNING: text not found")

# Korjaa myös groupByDate joka käyttää slice(0,10)
old2 = "    const d = e.timestamp.slice(0, 10);"
new2 = "    const d = new Date(e.timestamp).toLocaleDateString('en-US');"

if old2 in content:
    content = content.replace(old2, new2)
    print("groupByDate fix applied")
else:
    print("WARNING: groupByDate fix not found")

# Poista käyttämätön CLAUDE_MODEL ja apiKey
old3 = "// ─── AI (Claude Sonnet) ────────────────────────────────────────────────────\nconst CLAUDE_MODEL = 'claude-sonnet-4-20250514';\n\n"
new3 = ""

if old3 in content:
    content = content.replace(old3, new3)
    print("CLAUDE_MODEL removed")

open('src/screens/TimelineScreen.tsx', 'w').write(content)
print('Valmis!')
