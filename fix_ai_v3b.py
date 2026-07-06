#!/usr/bin/env python3
"""
Sentinel — Build 42: AI v3.0 parannukset (fixed)
Käyttää rivi-pohjaista korvausta backtick-ongelman välttämiseksi
"""

import os
import re

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/utils/aiEngine.ts')

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Backup
    backup = FILE + '.backup_ai_v3'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    changes = 0

    # ── 1. analyzeResults system prompt ──────────────────────────────────────
    old_analyze_system = (
        "  const system = `You are an expert OSINT analyst assistant for licensed private investigators, \n"
        "security professionals, and journalists. Analyze search results concisely and professionally. \n"
        "Flag inconsistencies, notable findings, and suggested follow-up actions. \n"
        "Never speculate beyond the data. Be direct and factual. Use bullet points.\n"
        "Do not include disclaimers about professional advice.`;"
    )
    new_analyze_system = (
        "  const system = `You are a senior OSINT analyst supporting licensed private investigators,\n"
        "corporate security professionals, bail enforcement agents, and process servers.\n"
        "Analyze intelligence data with precision and professionalism.\n"
        "Rules: Never speculate beyond the data. Be direct and factual. No disclaimers.\n"
        "Format responses with clear sections and bullet points.\n"
        "Prioritize actionable intelligence over general observations.`;"
    )

    if old_analyze_system in content:
        content = content.replace(old_analyze_system, new_analyze_system)
        changes += 1
        print("✅ analyzeResults system prompt päivitetty")
    else:
        print("⚠️  analyzeResults system prompt — ei täsmää, ohitetaan")

    # ── 2. analyzeResults user prompt ────────────────────────────────────────
    old_analyze_user = (
        "  const user = `Module: ${module}\n"
        "Query: ${query}\n"
        "Search Results:\n"
        "${filteredResults}\n"
        "Provide:\n"
        "1. Key findings (2-3 bullets)\n"
        "2. Anomalies or inconsistencies worth noting\n"
        "3. Recommended follow-up searches`;"
    )
    new_analyze_user = (
        "  const user = `MODULE: ${module}\n"
        "SUBJECT/QUERY: ${query}\n"
        "\n"
        "INTELLIGENCE DATA:\n"
        "${filteredResults}\n"
        "\n"
        "Provide a structured analysis:\n"
        "\n"
        "## KEY FINDINGS\n"
        "- List 3-5 most significant findings with source attribution\n"
        "\n"
        "## RISK INDICATORS\n"
        "- Flag any wanted status, sanctions hits, criminal records, or suspicious patterns\n"
        "- Note if subject appears in multiple negative databases\n"
        "\n"
        "## ANOMALIES & INCONSISTENCIES\n"
        "- Identify conflicting data points across sources\n"
        "- Note missing expected data (e.g., no digital footprint for active professional)\n"
        "\n"
        "## RECOMMENDED NEXT STEPS\n"
        "- List 3 specific follow-up investigative actions\n"
        "- Suggest additional modules or databases to query`;"
    )

    if old_analyze_user in content:
        content = content.replace(old_analyze_user, new_analyze_user)
        changes += 1
        print("✅ analyzeResults user prompt päivitetty")
    else:
        print("⚠️  analyzeResults user prompt — ei täsmää, ohitetaan")

    # ── 3. generateRiskProfile system prompt ─────────────────────────────────
    old_risk_system = (
        "  const system = `You are an expert risk analyst specializing in OSINT-based subject profiling.\n"
        "Assess risk indicators from gathered intelligence data.\n"
        "Be objective, factual, and structured. Use professional investigative language.`;"
    )
    new_risk_system = (
        "  const system = `You are a senior risk analyst specializing in OSINT-based subject profiling for\n"
        "licensed investigators and corporate security professionals.\n"
        "Assess risk indicators objectively and systematically.\n"
        "Use professional investigative language. Never speculate beyond available data.\n"
        "Respond ONLY with valid JSON, no markdown, no preamble.`;"
    )

    if old_risk_system in content:
        content = content.replace(old_risk_system, new_risk_system)
        changes += 1
        print("✅ generateRiskProfile system prompt päivitetty")
    else:
        print("⚠️  generateRiskProfile system prompt — ei täsmää, ohitetaan")

    # ── 4. generateRiskProfile user prompt ───────────────────────────────────
    old_risk_user = (
        "  const user = `Generate a risk profile for subject: ${subjectName}\n"
        "OSINT findings:\n"
        "${findingsText}\n"
        "Provide:\n"
        "1. Overall risk level (Low/Medium/High/Critical)\n"
        "2. Key risk indicators identified\n"
        "3. Red flags or anomalies\n"
        "4. Recommended follow-up actions\n"
        "5. Confidence assessment based on available data`;"
    )
    new_risk_user = (
        "  const user = `Generate a comprehensive risk profile for subject: ${subjectName}\n"
        "\n"
        "OSINT FINDINGS:\n"
        "${findingsText}\n"
        "\n"
        "Respond with this exact JSON structure:\n"
        "{\n"
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
        "}\n"
        "\n"
        "Risk scoring: 0-25=LOW, 26-50=MEDIUM, 51-75=HIGH, 76-100=CRITICAL.\n"
        "Base score on: wanted list matches (+40), sanctions hits (+35), criminal records (+25),\n"
        "financial irregularities (+15), reputational issues (+10), clean record (-10).`;"
    )

    if old_risk_user in content:
        content = content.replace(old_risk_user, new_risk_user)
        changes += 1
        print("✅ generateRiskProfile user prompt päivitetty")
    else:
        print("⚠️  generateRiskProfile user prompt — ei täsmää, ohitetaan")

    # ── 5. detectContradictions system prompt ────────────────────────────────
    old_contra_system = (
        "  const system = `You are an expert investigative analyst specializing in cross-source verification.\n"
        "Identify contradictions, inconsistencies, and discrepancies across multiple data sources.\n"
        "Be precise and cite specific conflicting data points.`;"
    )
    new_contra_system = (
        "  const system = `You are a senior investigative analyst specializing in cross-source verification\n"
        "and intelligence validation for licensed investigators and security professionals.\n"
        "Identify contradictions with precision and assess their investigative significance.\n"
        "Be specific — cite exact conflicting data points and their sources.\n"
        "No disclaimers. Professional language only.`;"
    )

    if old_contra_system in content:
        content = content.replace(old_contra_system, new_contra_system)
        changes += 1
        print("✅ detectContradictions system prompt päivitetty")
    else:
        print("⚠️  detectContradictions system prompt — ei täsmää, ohitetaan")

    # ── 6. detectContradictions user prompt ──────────────────────────────────
    old_contra_user = (
        "  const user = `Analyze the following OSINT findings for contradictions and inconsistencies:\n"
        "${findingsText}\n"
        "Identify:\n"
        "1. Direct contradictions between sources\n"
        "2. Suspicious inconsistencies\n"
        "3. Missing or unverifiable data points\n"
        "4. Recommended verification steps`;"
    )
    new_contra_user = (
        "  const user = `Perform a cross-source contradiction analysis on the following OSINT findings:\n"
        "\n"
        "${findingsText}\n"
        "\n"
        "Structure your analysis as follows:\n"
        "\n"
        "## CRITICAL CONTRADICTIONS (High investigative significance)\n"
        "- Direct conflicts that significantly affect subject credibility or risk assessment\n"
        "- Format: [Source A] states X, but [Source B] states Y — Significance: [explanation]\n"
        "\n"
        "## MINOR INCONSISTENCIES (Low-medium significance)\n"
        "- Minor discrepancies that may have innocent explanations\n"
        "\n"
        "## MISSING DATA FLAGS\n"
        "- Expected data points not found that warrant further investigation\n"
        "\n"
        "## DECEPTION INDICATORS\n"
        "- Patterns suggesting deliberate misrepresentation\n"
        "\n"
        "## VERIFICATION PRIORITIES\n"
        "- List 3 specific steps to resolve the most critical contradictions`;"
    )

    if old_contra_user in content:
        content = content.replace(old_contra_user, new_contra_user)
        changes += 1
        print("✅ detectContradictions user prompt päivitetty")
    else:
        print("⚠️  detectContradictions user prompt — ei täsmää, ohitetaan")

    # Tallenna
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n✅ {changes}/6 muutosta tehty onnistuneesti!")
    print(f"📦 Backup: {backup}")
    return changes > 0

if __name__ == '__main__':
    patch()
