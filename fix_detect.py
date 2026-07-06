content = open('src/utils/oneInputSearch.ts').read()

# 1. Korjaa company-tunnistus - lisää puuttuvat merkit ja sanat
old_detect = """export function detectInputType(input: string): InputType {
  const trimmed = input.trim();
  if (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(trimmed)) return 'email';
  if (/^[\\+]?[\\d\\s\\-\\(\\)]{7,15}$/.test(trimmed)) return 'phone';
  if (/^(\\d{1,3}\\.){3}\\d{1,3}$/.test(trimmed)) return 'ip';
  if (/^[a-zA-Z0-9\\-]+\\.[a-zA-Z]{2,}$/.test(trimmed) && !trimmed.includes(' ')) return 'domain';
  const companyKeywords = /\\b(inc|llc|ltd|corp|company|co\\.|group|holdings|enterprises|industries|technologies|tech|solutions|services|associates|partners|international|global)\\b/i;
  if (companyKeywords.test(trimmed)) return 'company';
  if (/^[a-zA-ZÀ-ÖØ-öø-ÿ\\s\\-\\'\\.]{3,}$/.test(trimmed) && trimmed.includes(' ')) return 'person';
  if (/^[a-zA-Z0-9\\s\\-\\.&,]{2,}$/.test(trimmed)) return 'company';
  return 'unknown';
}"""

new_detect = """export function detectInputType(input: string): InputType {
  const trimmed = input.trim();
  if (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(trimmed)) return 'email';
  if (/^[\\+]?[\\d\\s\\-\\(\\)]{7,20}$/.test(trimmed)) return 'phone';
  if (/^(\\d{1,3}\\.){3}\\d{1,3}$/.test(trimmed)) return 'ip';
  if (/^[a-zA-Z0-9\\-]+\\.[a-zA-Z]{2,}$/.test(trimmed) && !trimmed.includes(' ')) return 'domain';
  const companyKeywords = /\\b(inc|llc|ltd|corp|company|co\\.|group|holdings|enterprises|industries|technologies|tech|solutions|services|associates|partners|international|global|agency|holdco|realty|properties|ventures|capital|fund|trust|bank|financial)\\b/i;
  if (companyKeywords.test(trimmed)) return 'company';
  if (/[&,]/.test(trimmed)) return 'company';
  if (/^[a-zA-ZÀ-ÖØ-öø-ÿ\\s\\-\\'\\.]{3,}$/.test(trimmed) && trimmed.includes(' ')) return 'person';
  if (/^[a-zA-Z0-9\\s\\-\\.&,]{2,}$/.test(trimmed)) return 'company';
  return 'unknown';
}"""

if old_detect in content:
    content = content.replace(old_detect, new_detect)
    print("detectInputType fix applied")
else:
    print("WARNING: detectInputType not found — trying partial fix")
    # Korvaa vain phone regex ja company keywords
    content = content.replace(
        'if (/^[\\+]?[\\d\\s\\-\\(\\)]{7,15}$/.test(trimmed)) return \'phone\';',
        'if (/^[\\+]?[\\d\\s\\-\\(\\)]{7,20}$/.test(trimmed)) return \'phone\';'
    )
    content = content.replace(
        'const companyKeywords = /\\b(inc|llc|ltd|corp|company|co\\.|group|holdings|enterprises|industries|technologies|tech|solutions|services|associates|partners|international|global)\\b/i;',
        'const companyKeywords = /\\b(inc|llc|ltd|corp|company|co\\.|group|holdings|enterprises|industries|technologies|tech|solutions|services|associates|partners|international|global|agency|holdco|realty|properties|ventures|capital|fund|trust|bank|financial)\\b/i;'
    )
    content = content.replace(
        '  if (companyKeywords.test(trimmed)) return \'company\';',
        '  if (companyKeywords.test(trimmed)) return \'company\';\n  if (/[&,]/.test(trimmed)) return \'company\';'
    )
    print("Partial fixes applied")

open('src/utils/oneInputSearch.ts', 'w').write(content)
print('Valmis!')
