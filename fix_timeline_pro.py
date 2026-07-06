#!/usr/bin/env python3
"""
Sentinel — Build 42: Investigation Timeline Pro AI prompt parannus
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/screens/TimelineScreen.tsx')

OLD_PROMPT = """      const prompt = `You are an OSINT investigation analyst. Analyze the following investigation activity log from a professional investigator's session and provide a structured intelligence summary.

ACTIVITY LOG:
${logText}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "2-3 sentence overview of the investigation session",
  "findings": ["finding 1", "finding 2", "finding 3"],
  "risks": ["risk or concern 1", "risk or concern 2"],
  "questions": ["open question 1", "open question 2", "open question 3"]
}

Keep each item concise (max 15 words). Base findings only on actual log entries.`;

      const systemPrompt = 'You are an OSINT investigation analyst. Respond ONLY with valid JSON, no markdown, no preamble.';"""

NEW_PROMPT = """      const prompt = `You are a senior OSINT investigation analyst supporting licensed private investigators, corporate security professionals, and bail enforcement agents. Analyze the following investigation activity log and provide a structured professional intelligence summary.

ACTIVITY LOG:
${logText}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "2-3 sentence professional overview of the investigation session — what was investigated, key patterns observed, overall assessment",
  "findings": [
    "Most significant finding from the session with source",
    "Second key finding — pattern or connection identified",
    "Third finding — any anomalies or notable results"
  ],
  "risks": [
    "Primary risk indicator identified during session",
    "Secondary concern or red flag worth noting"
  ],
  "questions": [
    "Most critical open question requiring follow-up investigation",
    "Second unanswered question based on findings",
    "Recommended next investigative step"
  ]
}

Rules:
- Base ALL findings strictly on actual log entries — never speculate
- Keep each item under 20 words
- Use professional investigative language
- Prioritize actionable intelligence`;

      const systemPrompt = 'You are a senior OSINT investigation analyst. Respond ONLY with valid JSON, no markdown, no preamble. Never speculate beyond the provided data.';"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_PROMPT not in content:
        print("❌ Timeline prompt ei löydy")
        return False

    backup = FILE + '.backup_timeline_pro'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_PROMPT, NEW_PROMPT)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ Timeline Pro AI prompt päivitetty!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
