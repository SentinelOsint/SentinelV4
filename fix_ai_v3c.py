#!/usr/bin/env python3
"""
Sentinel — Build 42: AI v3.0 user promptit (fixed v2)
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/utils/aiEngine.ts')

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    content = ''.join(lines)

    backup = FILE + '.backup_ai_v3_user'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    changes = 0

    # ── 1. analyzeResults user prompt ────────────────────────────────────────
    old1 = '  const user = `Module: ${module}\nQuery: ${query}\nSearch Results:\n${filteredResults}\nProvide:\n1. Key findings (2-3 bullets)\n2. Anomalies or inconsistencies worth noting\n3. Recommended follow-up searches`;'
    new1 = '  const user = `MODULE: ${module}\nSUBJECT/QUERY: ${query}\n\nINTELLIGENCE DATA:\n${filteredResults}\n\nProvide a structured analysis:\n\n## KEY FINDINGS\n- List 3-5 most significant findings with source attribution\n\n## RISK INDICATORS\n- Flag any wanted status, sanctions hits, criminal records, or suspicious patterns\n- Note if subject appears in multiple negative databases\n\n## ANOMALIES & INCONSISTENCIES\n- Identify conflicting data points across sources\n- Note missing expected data (e.g., no digital footprint for active professional)\n\n## RECOMMENDED NEXT STEPS\n- List 3 specific follow-up investigative actions\n- Suggest additional modules or databases to query`;'

    if old1 in content:
        content = content.replace(old1, new1)
        changes += 1
        print("✅ analyzeResults user prompt päivitetty")
    else:
        print("⚠️  analyzeResults user prompt — etsitään rivit...")
        # Tulostetaan debug
        idx = content.find('const user = `Module: ${module}')
        if idx >= 0:
            print(f"   Löytyi kohdasta {idx}:")
            print(repr(content[idx:idx+200]))
        else:
            print("   Ei löydy lainkaan")

    # ── 2. generateRiskProfile user prompt ───────────────────────────────────
    old2 = '  const user = `Generate a risk profile for subject: ${subjectName}\nOSINT findings:\n${findingsText}\nProvide:\n1. Overall risk level (Low/Medium/High/Critical)\n2. Key risk indicators identified\n3. Red flags or anomalies\n4. Recommended follow-up actions\n5. Confidence assessment based on available data`;'
    new2 = ('  const user = `Generate a comprehensive risk profile for subject: ${subjectName}\n'
            '\n'
            'OSINT FINDINGS:\n'
            '${findingsText}\n'
            '\n'
            'Respond with this exact JSON structure:\n'
            '{\n'
            '  "riskScore": <0-100 integer>,\n'
            '  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",\n'
            '  "summary": "<2-3 sentence professional overview>",\n'
            '  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"],\n'
            '  "riskIndicators": {\n'
            '    "criminal": "<None|Low|Medium|High>",\n'
            '    "financial": "<None|Low|Medium|High>",\n'
            '    "reputational": "<None|Low|Medium|High>",\n'
            '    "sanctions": "<None|Low|Medium|High>"\n'
            '  },\n'
            '  "redFlags": ["<red flag 1>"] or [],\n'
            '  "contradictions": ["<contradiction 1>"] or [],\n'
            '  "recommendedActions": ["<action 1>", "<action 2>", "<action 3>"],\n'
            '  "confidenceLevel": "<LOW|MEDIUM|HIGH>",\n'
            '  "confidenceNote": "<reason for confidence level>"\n'
            '}\n'
            '\n'
            'Risk scoring: 0-25=LOW, 26-50=MEDIUM, 51-75=HIGH, 76-100=CRITICAL.\n'
            'Base score on: wanted list matches (+40), sanctions hits (+35), criminal records (+25),\n'
            'financial irregularities (+15), reputational issues (+10), clean record (-10).`;')

    if old2 in content:
        content = content.replace(old2, new2)
        changes += 1
        print("✅ generateRiskProfile user prompt päivitetty")
    else:
        print("⚠️  generateRiskProfile user prompt — etsitään rivit...")
        idx = content.find('const user = `Generate a risk profile')
        if idx >= 0:
            print(f"   Löytyi kohdasta {idx}:")
            print(repr(content[idx:idx+300]))
        else:
            print("   Ei löydy lainkaan")

    # ── 3. detectContradictions user prompt ──────────────────────────────────
    old3 = '  const user = `Analyze the following OSINT findings for contradictions and inconsistencies:\n${findingsText}\nIdentify:\n1. Direct contradictions between sources\n2. Suspicious inconsistencies\n3. Missing or unverifiable data points\n4. Recommended verification steps`;'
    new3 = '  const user = `Perform a cross-source contradiction analysis on the following OSINT findings:\n\n${findingsText}\n\nStructure your analysis as follows:\n\n## CRITICAL CONTRADICTIONS (High investigative significance)\n- Direct conflicts that significantly affect subject credibility or risk assessment\n- Format: [Source A] states X, but [Source B] states Y — Significance: [explanation]\n\n## MINOR INCONSISTENCIES (Low-medium significance)\n- Minor discrepancies that may have innocent explanations\n\n## MISSING DATA FLAGS\n- Expected data points not found that warrant further investigation\n\n## DECEPTION INDICATORS\n- Patterns suggesting deliberate misrepresentation\n\n## VERIFICATION PRIORITIES\n- List 3 specific steps to resolve the most critical contradictions`;'

    if old3 in content:
        content = content.replace(old3, new3)
        changes += 1
        print("✅ detectContradictions user prompt päivitetty")
    else:
        print("⚠️  detectContradictions user prompt — etsitään rivit...")
        idx = content.find('const user = `Analyze the following OSINT')
        if idx >= 0:
            print(f"   Löytyi kohdasta {idx}:")
            print(repr(content[idx:idx+300]))
        else:
            print("   Ei löydy lainkaan")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✅ {changes}/3 user promptia päivitetty!")
    print(f"📦 Backup: {backup}")

if __name__ == '__main__':
    patch()
