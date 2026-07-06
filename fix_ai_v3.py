#!/usr/bin/env python3
"""
Sentinel — Build 42: AI v3.0 parannukset
Parannetaan analyzeResults, generateRiskProfile ja detectContradictions -prompteja
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/utils/aiEngine.ts')

# ── 1. analyzeResults — tarkempi ammattimaisempi analyysi ─────────────────
OLD_ANALYZE = """  const system = `You are an expert OSINT analyst assistant for licensed private investigators, 
security professionals, and journalists. Analyze search results concisely and professionally. 
Flag inconsistencies, notable findings, and suggested follow-up actions. 
Never speculate beyond the data. Be direct and factual. Use bullet points.
Do not include disclaimers about professional advice.`;
  const user = `Module: ${module}
Query: ${query}
Search Results:
${filteredResults}
Provide:
1. Key findings (2-3 bullets)
2. Anomalies or inconsistencies worth noting
3. Recommended follow-up searches`;"""

NEW_ANALYZE = """  const system = `You are a senior OSINT analyst supporting licensed private investigators, 
corporate security professionals, bail enforcement agents, and process servers.
Analyze intelligence data with precision and professionalism.
Rules: Never speculate beyond the data. Be direct and factual. No disclaimers.
Format responses with clear sections and bullet points.
Prioritize actionable intelligence over general observations.`;
  const user = `MODULE: ${module}
SUBJECT/QUERY: ${query}

INTELLIGENCE DATA:
${filteredResults}

Provide a structured analysis:

## KEY FINDINGS
- List 3-5 most significant findings with source attribution

## RISK INDICATORS
- Flag any wanted status, sanctions hits, criminal records, or suspicious patterns
- Note if subject appears in multiple negative databases

## ANOMALIES & INCONSISTENCIES
- Identify conflicting data points across sources
- Note missing expected data (e.g., no digital footprint for active professional)

## RECOMMENDED NEXT STEPS
- List 3 specific follow-up investigative actions
- Suggest additional modules or databases to query`;"""

# ── 2. generateRiskProfile — strukturoitu JSON numeerisella pisteellä ─────
OLD_RISK = """  const system = `You are an expert risk analyst specializing in OSINT-based subject profiling.
Assess risk indicators from gathered intelligence data.
Be objective, factual, and structured. Use professional investigative language.`;
  const user = `Generate a risk profile for subject: ${subjectName}
OSINT findings:
${findingsText}
Provide:
1. Overall risk level (Low/Medium/High/Critical)
2. Key risk indicators identified
3. Red flags or anomalies
4. Recommended follow-up actions
5. Confidence assessment based on available data`;"""

NEW_RISK = """  const system = `You are a senior risk analyst specializing in OSINT-based subject profiling for 
licensed investigators and corporate security professionals.
Assess risk indicators objectively and systematically.
Use professional investigative language. Never speculate beyond available data.
Respond ONLY with valid JSON, no markdown, no preamble.`;
  const user = `Generate a comprehensive risk profile for subject: ${subjectName}

OSINT FINDINGS:
${findingsText}

Respond with this exact JSON structure:
{
  "riskScore": <0-100 integer>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "summary": "<2-3 sentence professional overview>",
  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "riskIndicators": {
    "criminal": "<None|Low|Medium|High>",
    "financial": "<None|Low|Medium|High>",
    "reputational": "<None|Low|Medium|High>",
    "sanctions": "<None|Low|Medium|High>"
  },
  "redFlags": ["<red flag 1>"] or [],
  "contradictions": ["<contradiction 1>"] or [],
  "recommendedActions": ["<action 1>", "<action 2>", "<action 3>"],
  "confidenceLevel": "<LOW|MEDIUM|HIGH>",
  "confidenceNote": "<reason for confidence level>"
}

Risk scoring: 0-25=LOW, 26-50=MEDIUM, 51-75=HIGH, 76-100=CRITICAL.
Base score on: wanted list matches (+40), sanctions hits (+35), criminal records (+25), 
financial irregularities (+15), reputational issues (+10), clean record (-10).`;"""

# ── 3. detectContradictions — vakavuusasteluokittelu ──────────────────────
OLD_CONTRADICTIONS = """  const system = `You are an expert investigative analyst specializing in cross-source verification.
Identify contradictions, inconsistencies, and discrepancies across multiple data sources.
Be precise and cite specific conflicting data points.`;
  const user = `Analyze the following OSINT findings for contradictions and inconsistencies:
${findingsText}
Identify:
1. Direct contradictions between sources
2. Suspicious inconsistencies
3. Missing or unverifiable data points
4. Recommended verification steps`;"""

NEW_CONTRADICTIONS = """  const system = `You are a senior investigative analyst specializing in cross-source verification 
and intelligence validation for licensed investigators and security professionals.
Identify contradictions with precision and assess their investigative significance.
Be specific — cite exact conflicting data points and their sources.
No disclaimers. Professional language only.`;
  const user = `Perform a cross-source contradiction analysis on the following OSINT findings:

${findingsText}

Structure your analysis as follows:

## CRITICAL CONTRADICTIONS (High investigative significance)
- Direct conflicts that significantly affect subject credibility or risk assessment
- Format: [Source A] states X, but [Source B] states Y — Significance: [explanation]

## MINOR INCONSISTENCIES (Low-medium significance)
- Minor discrepancies that may have innocent explanations
- Format: [Finding] — Possible explanation: [options]

## MISSING DATA FLAGS
- Expected data points not found (gaps that warrant further investigation)
- Why each gap is significant

## DECEPTION INDICATORS
- Patterns suggesting deliberate misrepresentation
- Specific evidence supporting each indicator

## VERIFICATION PRIORITIES
- List 3 specific steps to resolve the most critical contradictions
- Include specific databases or sources to consult`;"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    errors = []
    if OLD_ANALYZE not in content:
        errors.append("analyzeResults prompt")
    if OLD_RISK not in content:
        errors.append("generateRiskProfile prompt")
    if OLD_CONTRADICTIONS not in content:
        errors.append("detectContradictions prompt")

    if errors:
        print(f"❌ Ei löydy: {', '.join(errors)}")
        return False

    # Backup
    backup = FILE + '.backup_ai_v3'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_ANALYZE, NEW_ANALYZE)
    content = content.replace(OLD_RISK, NEW_RISK)
    content = content.replace(OLD_CONTRADICTIONS, NEW_CONTRADICTIONS)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ AI v3.0 parannukset tehty!")
    print("   - analyzeResults: tarkempi ammattimaisempi analyysi")
    print("   - generateRiskProfile: strukturoitu JSON numeerisella pisteellä")
    print("   - detectContradictions: vakavuusasteluokittelu")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
