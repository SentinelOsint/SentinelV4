/**
 * SENTINEL – AI Analysis Engine
 *
 * Four AI-powered features (Pro tier only):
 *
 * 1. analyzeResults     – Summarizes OSINT search results, flags anomalies
 * 2. generateReport     – Writes a professional client-ready case report
 * 3. suggestStrategy    – Recommends OSINT sources and next steps
 * 4. summarizeNotes     – Condenses field notes into key findings
 *
 * All calls use Claude Sonnet via Anthropic API.
 * API key is stored encrypted in SecureStorage (never in code).
 * Usage is tracked per month with a 500-call soft cap per user.
 */

import { SecureStorage } from './secureStorage';
import { AuditLog }      from './auditLog';
import { OsintResult, FieldNote, CaseReport } from '../types';

const API_URL   = 'https://sentinel-backend-production-05e1.up.railway.app/ai/analyze';
const BACKEND_BASE_URL = 'https://sentinel-backend-production-05e1.up.railway.app';
const MODEL     = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

// Storage keys
const USAGE_KEY  = 'sentinel_ai_usage_v1';
const APIKEY_KEY = 'sentinel_anthropic_key_v1';
const MONTHLY_CAP = 500;
const TRIAL_AI_CAP = 10;

// New subscriber protection: limit AI queries during Apple's refund window
// After 14 days, full monthly cap applies automatically
const NEW_SUBSCRIBER_CAP = 50;
const REFUND_WINDOW_DAYS = 14;

// ── Usage tracking ────────────────────────────────────────────────────────────

interface UsageRecord {
  month: string;   // "2026-03"
  count: number;
}

// Returns the date when the Pro subscription started
// Uses the same TRIAL_KEY that Trial.initialize() sets in storage.ts
async function getSubscriptionStartDate(): Promise<Date | null> {
  try {
    const { SecureStorage } = await import('./secureStorage');
    const iso = await SecureStorage.get<string>('sentinel_trial_v1');
    return iso ? new Date(iso) : null;
  } catch { return null; }
}

// Returns the effective AI cap based on how long the subscription has been active
async function getEffectiveAICap(): Promise<number> {
  try {
    const { Trial } = await import('./storage');
    const tier = await Trial.getSubscriptionTier();
    if (tier === 'trial') return TRIAL_AI_CAP; // Trial users get 10 AI queries
    if (tier === 'expired') return 0; // Trial ended and no active paid subscription — block AI usage entirely
    const startDate = await getSubscriptionStartDate();
    if (!startDate) return NEW_SUBSCRIBER_CAP; // No start date — use conservative limit
    const daysSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceStart < REFUND_WINDOW_DAYS) {
      return NEW_SUBSCRIBER_CAP; // Still in refund window
    }
    return MONTHLY_CAP; // Refund window passed — full cap
  } catch { return NEW_SUBSCRIBER_CAP; }
}

async function getUsage(): Promise<UsageRecord> {
  try {
    const data = await SecureStorage.get<UsageRecord>(USAGE_KEY);
    const thisMonth = new Date().toISOString().slice(0, 7);
    if (!data || data.month !== thisMonth) return { month: thisMonth, count: 0 };
    return data;
  } catch { return { month: new Date().toISOString().slice(0, 7), count: 0 }; }
}

async function incrementUsage(): Promise<number> {
  try {
    const usage = await getUsage();
    usage.count++;
    await SecureStorage.set(USAGE_KEY, usage);
    return usage.count;
  } catch { return 0; }
}

export async function getAIUsageThisMonth(): Promise<{ count: number; cap: number; remaining: number; isNewSubscriber: boolean }> {
  const usage = await getUsage();
  const effectiveCap = await getEffectiveAICap();
  const isNewSubscriber = effectiveCap === NEW_SUBSCRIBER_CAP;
  return {
    count: usage.count,
    cap: effectiveCap,
    remaining: Math.max(0, effectiveCap - usage.count),
    isNewSubscriber,
  };
}

// ── API key management ────────────────────────────────────────────────────────

export async function saveAPIKey(key: string): Promise<void> {
  await SecureStorage.set(APIKEY_KEY, key.trim());
}

export async function getAPIKey(): Promise<string | null> {
  try {
    return await SecureStorage.get<string>(APIKEY_KEY);
  } catch { return null; }
}

export async function hasAPIKey(): Promise<boolean> {
  const key = await getAPIKey();
  return !!(key && key.startsWith('sk-ant-'));
}

// ── Core API call ─────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  // Check usage cap — uses reduced limit during Apple's 14-day refund window
  const usage = await getUsage();
  const effectiveCap = await getEffectiveAICap();
  if (usage.count >= effectiveCap) throw new Error('USAGE_CAP_REACHED');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userPrompt: userMessage }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API error ${response.status}`);
  }
  const data = await response.json();
  await incrementUsage();
  return data.result ?? '';
}

// ── Error message helper ──────────────────────────────────────────────────────

export function getAIErrorMessage(error: Error): string {
  switch (error.message) {
    case 'NO_API_KEY':
      return 'Anthropic API key not configured. Go to Security Settings → AI Configuration to add your key.';
    case 'INVALID_API_KEY':
      return 'Invalid API key. Check your key in Security Settings → AI Configuration.';
    case 'RATE_LIMITED':
      return 'Too many requests. Wait a moment and try again.';
    case 'USAGE_CAP_REACHED':
      return `AI query limit reached. To prevent misuse and protect platform integrity, ` +
        `new Pro subscribers are limited to ${NEW_SUBSCRIBER_CAP} AI queries during the first ${REFUND_WINDOW_DAYS} days. ` +
        `Your full limit of ${MONTHLY_CAP} queries/month unlocks automatically after day ${REFUND_WINDOW_DAYS}.`;
    default:
      return `AI error: ${error.message}`;
  }
}

// ── Feature 1: Analyze search results ────────────────────────────────────────

export async function analyzeResults(
  module: string,
  query: string,
  results: OsintResult[]
): Promise<string> {
  const filteredResults = results
    .filter(r => r.value && r.value.trim())
    .map(r => `${r.label}: ${r.value}`)
    .join('\n');

  if (!filteredResults.trim()) {
    throw new Error('No data to analyze. Run a search first.');
  }

  const system = `You are a senior OSINT analyst supporting licensed private investigators,
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
- Suggest additional modules or databases to query`;

  await AuditLog.log('SEARCH_QUERY', `AI Analysis: ${module} – ${query}`);
  return await callClaude(system, user);
}

// ── Feature 2: Generate case report ──────────────────────────────────────────

export async function generateCaseReport(caseData: CaseReport): Promise<string> {
  const searchSummary = caseData.searches
    .slice(0, 30)
    .map(s => `- ${s.module}: "${s.query}" (${s.timestamp})`)
    .join('\n');

  const notesSummary = caseData.notes
    .slice(0, 20)
    .map(n => `[${n.tag}] ${n.text}`)
    .join('\n');

  const system = `You are an expert investigative report writer for licensed professionals.
Write professional, factual investigation reports suitable for client delivery or legal proceedings.
Use formal language. Structure clearly with sections. Do not invent facts not present in the data.
Format: plain text with clear section headers using === markers.`;

  const user = `Write a professional investigation report for the following case:

Case Title: ${caseData.title}
Subject: ${caseData.subject || 'Not specified'}
Status: ${caseData.status.toUpperCase()}
Priority: ${caseData.priority.toUpperCase()}
Location: ${caseData.location || 'Not specified'}
Description: ${caseData.description}
Created: ${caseData.createdAt}
Tags: ${caseData.tags.join(', ') || 'None'}

Research Conducted (${caseData.searches.length} searches):
${searchSummary}
${caseData.searches.length > 30 ? `... and ${caseData.searches.length - 30} more searches` : ''}

Field Notes (${caseData.notes.length} entries):
${notesSummary}
${caseData.notes.length > 20 ? `... and ${caseData.notes.length - 20} more notes` : ''}

Include sections: Executive Summary, Research Methodology, Key Findings, Conclusion, Recommended Next Steps.`;

  await AuditLog.log('CASE_EXPORT_PDF', `AI Report: ${caseData.title}`);
  return await callClaude(system, user);
}

// ── Feature 3: Search strategy advisor ───────────────────────────────────────

export async function suggestSearchStrategy(
  subjectType: string,
  query: string,
  context: string
): Promise<string> {
  const system = `You are an expert OSINT strategist for licensed investigators.
Recommend specific, actionable search strategies using publicly available sources.
Focus on legal open-source methods only. Be specific about which databases, 
search techniques, and Sentinel modules to use. Use numbered lists.`;

  const user = `I need an OSINT search strategy for the following:

Subject type: ${subjectType}
Query / Subject: ${query}
Context / Goal: ${context || 'General investigation'}

Provide:
1. Recommended Sentinel modules to use (in order of priority)
2. Specific search terms and variations to try
3. Key public databases relevant to this subject type
4. Cross-referencing tips to verify findings
5. Common pitfalls to avoid`;

  await AuditLog.log('SEARCH_QUERY', `AI Strategy: ${subjectType} – ${query}`);
  return await callClaude(system, user);
}

// ── Feature 4: Summarize field notes ─────────────────────────────────────────

export async function summarizeNotes(notes: FieldNote[]): Promise<string> {
  if (notes.length === 0) throw new Error('No notes to summarize.');

  const noteText = notes
    .map(n => `[${n.tag} – ${n.timestamp}]\n${n.text}`)
    .join('\n\n');

  const system = `You are an expert analyst summarizing field investigation notes.
Extract key findings, patterns, and actionable intelligence from raw notes.
Be concise and structured. Group related findings. Highlight contradictions.`;

  const user = `Summarize the following ${notes.length} field notes from an investigation:

${noteText}

Provide:
1. Key findings (grouped by theme)
2. Timeline of significant events (if apparent)
3. Unresolved questions or gaps
4. Priority items requiring follow-up`;

  await AuditLog.log('SEARCH_QUERY', `AI Notes Summary: ${notes.length} notes`);
  return await callClaude(system, user);
}

// ─── Natural-Language Case Search ──────────────────────────────────────────

export async function searchCasesNaturalLanguage(
  query: string,
  cases: CaseReport[]
): Promise<{ caseId: string; title: string; reason: string }[]> {
  if (cases.length === 0 || !query.trim()) return [];

  const casesSummary = cases.map((c: any) => ({
    id: c.id,
    title: c.title,
    tags: c.tags || [],
    status: c.status,
    notes: (c.notes || []).map((n: any) => n.text).join(' | '),
    searchQueries: (c.searches || []).map((s: any) => s.query).join(', '),
  }));

  const system = `You are a case search assistant for a professional investigation platform.
Given a natural-language query and a list of saved cases (with titles, tags, status, field notes, and logged search queries), identify which cases are genuinely relevant to the query.
Only include cases with an explainable connection to specific content in that case — never guess or include weak/speculative matches.
Respond ONLY with valid JSON, no markdown, no preamble.`;

  const user = `QUERY: ${query}

CASES:
${JSON.stringify(casesSummary, null, 2)}

Respond with this exact JSON structure:
{
  "matches": [
    { "id": "<case id>", "reason": "<short explanation referencing the specific matched content, e.g. a note, tag, or search query>" }
  ]
}
If no cases match, return {"matches": []}.`;

  await AuditLog.log('SEARCH_QUERY', `AI Case Search: ${query}`);
  const result = await callClaude(system, user);
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.matches || []).map((m: any) => {
      const c = cases.find((cc: any) => cc.id === m.id);
      return { caseId: m.id, title: c?.title || 'Unknown case', reason: m.reason };
    });
  } catch {
    return [];
  }
}

// ─── v3.0 AI Features ──────────────────────────────────────────────────────

export async function generateRiskProfile(
  subjectName: string,
  findings: OsintResult[]
): Promise<string> {
  const findingsText = findings
    .map(f => `${f.label}: ${f.value}`)
    .join('\n');
  const system = `You are a senior risk analyst specializing in OSINT-based subject profiling for
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
financial irregularities (+15), reputational issues (+10), clean record (-10).`;
  await AuditLog.log('SEARCH_QUERY', `AI Risk Profile: ${subjectName}`);
  return await callClaude(system, user);
}

export async function detectContradictions(
  findings: OsintResult[]
): Promise<string> {
  const findingsText = findings
    .map(f => `${f.label}: ${f.value}`)
    .join('\n');
  const system = `You are a senior investigative analyst specializing in cross-source verification
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

## MISSING DATA FLAGS
- Expected data points not found that warrant further investigation

## DECEPTION INDICATORS
- Patterns suggesting deliberate misrepresentation

## VERIFICATION PRIORITIES
- List 3 specific steps to resolve the most critical contradictions`;
  await AuditLog.log('SEARCH_QUERY', 'AI Contradiction Detection');
  return await callClaude(system, user);
}

export async function analyzeImage(
  imageDescription: string,
  context?: string
): Promise<string> {
  const system = `You are an expert OSINT image analyst.
Analyze image metadata, content, and context for investigative intelligence.
Identify persons, locations, objects, timestamps, and potential leads.`;
  const user = `Analyze the following image for OSINT intelligence:

Image description/metadata: ${imageDescription}
${context ? `Context: ${context}` : ''}

Provide:
1. Key observations and identifiable elements
2. Potential location indicators
3. Timestamp or date clues
4. Persons or entities of interest
5. Recommended follow-up searches`;
  await AuditLog.log('SEARCH_QUERY', 'AI Image Analysis');
  return await callClaude(system, user);
}

// ─── Image Forensics: AI Forensic Interpretation ───────────────────────────

export async function generateImageForensicInterpretation(
  metadata: any,
  ela: any,
  compressionAnalysis: any,
  hiddenData: any,
  phashInfo?: any
): Promise<string> {
  const system = `You are a forensic image analyst supporting licensed investigators and security professionals in interpreting the output of automated image forensics tools.

CRITICAL PRINCIPLE: identify forensic indicators, never declare an image authentic or manipulated from a single signal or even from the combined results. Multiple weak indicators do not add up to proof. Technical indicators require corroboration and professional judgment.

Structure your interpretation into exactly these categories:
- SUPPORTED FINDINGS: technical facts directly established by the tool output (e.g. "the image contains no EXIF metadata", "estimated JPEG quality is 80%").
- POSSIBLE ANOMALIES: patterns that could indicate editing or manipulation but have plausible innocent explanations too (e.g. elevated ELA differences in a specific region, absence of expected metadata).
- CONFLICTING INDICATORS: cases where two or more findings point in different directions (e.g. metadata looks original but compression pattern suggests re-save).
- LIMITATIONS: what this analysis cannot determine, and why (e.g. "ELA is sensitive to image content and cannot localize edits with certainty in low-detail regions").
- RECOMMENDED VERIFICATION: concrete next steps a professional could take to resolve remaining uncertainty (e.g. "compare against the original file if available", "request the source device").

Never use absolute language ("this image was edited", "this proves manipulation"). Use calibrated language: "suggests," "is consistent with," "cannot be ruled out," "requires further verification."`;

  const user = `Interpret the following automated image forensics results for a professional investigator.

METADATA EXTRACTION:
${JSON.stringify(metadata, null, 2)}

ERROR LEVEL ANALYSIS (per-quality stats; visual heatmap image omitted from this text):
${JSON.stringify(ela?.perQuality ? { perQuality: ela.perQuality, note: ela.note } : ela, null, 2)}

JPEG / COMPRESSION ANALYSIS:
${JSON.stringify(compressionAnalysis, null, 2)}

HIDDEN-DATA SCREENING:
${JSON.stringify(hiddenData, null, 2)}
${phashInfo ? `\nPERCEPTUAL HASH / DUPLICATE COMPARISON:\n${JSON.stringify(phashInfo, null, 2)}\n` : ''}
Respond with this exact structure (plain text, use these exact headers):

SUPPORTED FINDINGS
- ...

POSSIBLE ANOMALIES
- ...

CONFLICTING INDICATORS
- ...

LIMITATIONS
- ...

RECOMMENDED VERIFICATION
- ...

ASSESSMENT
<2-3 sentence plain-language summary. Must end with an explicit statement that the available indicators do not, on their own, establish that the image was or was not manipulated.>`;

  await AuditLog.log('SEARCH_QUERY', 'AI Image Forensic Interpretation');
  return await callClaude(system, user);
}

// ─── Image Forensics: Backend Endpoint Wrappers ─────────────────────────────

async function postImageEndpoint(path: string, body: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Image forensics request failed: ${response.status}`);
  }
  return await response.json();
}

export async function extractImageMetadata(imageBase64: string): Promise<any> {
  return postImageEndpoint('/image/metadata', { imageBase64 });
}

export async function analyzeImageELA(imageBase64: string): Promise<any> {
  return postImageEndpoint('/image/ela', { imageBase64 });
}

export async function analyzeImageCompression(imageBase64: string): Promise<any> {
  return postImageEndpoint('/image/compression-analysis', { imageBase64 });
}

export async function screenImageHiddenData(imageBase64: string): Promise<any> {
  return postImageEndpoint('/image/hidden-data', { imageBase64 });
}

export async function computeImagePerceptualHash(imageBase64: string): Promise<any> {
  return postImageEndpoint('/image/phash', { imageBase64 });
}

// ─── Pre-Contact Intelligence Brief ────────────────────────────────────────

export async function generatePreContactBrief(
  query: string,
  inputType: string,
  findings: OsintResult[],
  assessmentPurpose?: string,
  caseContext?: {
    previousSearches?: string[];
    confirmedFindings?: string[];
    rejectedAssociations?: string[];
    resolvedGaps?: string[];
    userNotes?: string;
  },
  professionalRole?: string
): Promise<string> {
  const findingsText = findings
    .filter(f => f.value && f.value.trim())
    .map(f => `${f.label}: ${f.value}`)
    .join('\n');

  if (!findingsText.trim()) {
    throw new Error('No data available for Pre-Contact Brief. Run searches first.');
  }

  const system = `You are a senior field intelligence analyst supporting licensed private investigators,
bail enforcement agents, process servers, executive protection specialists, and corporate security professionals.
Your role is to produce operationally useful Pre-Contact Intelligence Briefs — not general summaries.
Critical rules:
- Clearly distinguish between: CONFIRMED FACTS, POSSIBLE ASSOCIATIONS, UNCERTAIN FINDINGS, and AI INTERPRETATIONS
- Never state a person is dangerous, criminal, or fraudulent without direct evidence
- Use language like: "possible risk indicator", "requires verification", "inconsistent with available records", "identity association is uncertain", "further checks recommended"
- Be concise. Field professionals read this before contact — brevity and clarity are essential
- Always include confidence level and source basis for each section

SELF-CRITIQUE BEFORE OUTPUT (apply before generating the brief):
1. Which claims are directly supported by a source? Label them SOURCE CONFIRMED or SUPPORTED.
2. Which claims are inferred or synthesized? Place them in aiAssistedInterpretation only.
3. What could be an alternative explanation for each significant finding?
4. What information is missing that would change the assessment?
5. What conclusion would be unsafe or unsupported to make?
6. What is the single most useful next action for the user?
7. Is any claim repeated across multiple sections without adding new information? Remove the duplicate.

HALLUCINATION GUARD (apply to every statement):
- Never present a claim without a source reference or explicit AI interpretation label.
- Never treat absence of data as confirmation of absence. "No result returned" ≠ "no record exists" ≠ "no risk".
- Never treat a technical failure, API error, or unexecuted search as a finding.
- Never repeat the same underlying source as if it were multiple independent sources.
- Never fill an evidence gap with a generalized assumption about criminal behavior or character.
- If you cannot support a claim, remove it or place it explicitly in aiAssistedInterpretation with full uncertainty disclosure.

BIAS CHECK (apply before finalizing):
- Is any single unverified finding receiving disproportionate weight?
- Has neutral or positive evidence been overlooked or minimized?
- Has the user's initial framing or query influenced the direction of the analysis?
- Has an uncertain association been elevated to a risk indicator without sufficient basis?
- Has the same source been cited multiple times as if it provides independent corroboration?
- If any of these are true, rebalance the brief before output.

SOURCE RECONCILIATION (apply when sources conflict):
When different sources provide different information, explain WHY before labeling it a contradiction:
- Could the records reflect different time periods? (e.g. old vs current address)
- Could one source use a different name format or alias?
- Could the conflict reflect data-entry errors rather than factual differences?
- Could the records refer to different individuals with similar identifiers?
- Could one source be a dependent copy of another, not an independent confirmation?
If a conflict can be explained by timing or formatting, classify it as IDENTITY_AMBIGUITY or POSSIBLE_ASSOCIATION, not CONTRADICTION.
Only use CONTRADICTION when two sources provide genuinely incompatible information about the same fact at the same time.
When reconciling, provide a plain-language explanation such as:
- "The two addresses may represent different time periods rather than a direct conflict."
- "The conflicting dates of birth likely indicate these records refer to different individuals."
- "The name variation may reflect a common nickname or data-entry difference, not a separate identity." 

ALTERNATIVE HYPOTHESIS GENERATOR (apply to every significant finding):
When a finding appears significant, always consider and document at least one alternative explanation:
- Could this record refer to a different individual with the same name?
- Could this be an outdated or superseded record?
- Could this reflect a data-entry error or system artifact?
- Could there be an alias overlap or name variation?
- Could the association be coincidental rather than causal?
Document alternatives in the finding's alternativeExplanation field and in possibleAssociations where relevant.
Never present a finding as conclusive without explicitly addressing alternative explanations.

TERMINOLOGY CONTROL (use these terms consistently — never substitute):
- SOURCE CONFIRMED: directly returned and verified from an authoritative source
- SUPPORTED: consistent with available evidence but not directly confirmed
- POSSIBLE ASSOCIATION: may relate to the subject but is unverified
- UNVERIFIED: present in data but not confirmed
- NOT ASSESSED: search not executed or source unavailable
- INFORMATION GAP: missing data that would affect the assessment
- AI-ASSISTED INTERPRETATION: analytical synthesis — not source-confirmed
- PROFESSIONAL REVIEW REQUIRED: user judgment is necessary before operational use
- REQUIRES VERIFICATION: further checking is needed before relying on this finding
Do NOT use: likely, probable, suspected, potential, possible (without qualification), confirmed (unless source-confirmed).
Use instead: appears to, may be, available evidence suggests, cannot be excluded, requires verification.

- CRITICAL: Do NOT place unexecuted or unavailable searches in potentialRiskIndicators. If a source was not searched, place it in informationGaps with suggestedCheck. Example: OFAC not searched → informationGap, NOT a risk indicator.
- Do NOT create risk indicators from absence of data. "No OFAC search was run" is an information gap, not a sanctions risk.
- Speculative psychological profiling or behavioral prediction must go in aiAssistedInterpretation, not potentialRiskIndicators.
- NEVER use language like: "may react unpredictably", "likely hostile", "may become violent", "tactical awareness", "may confront", "psychologically unstable".
- When behavior or threat posture is unknown, state ONLY: "Current behavior and threat posture are unknown. No inference should be made about the queried subject until identity is verified."
- The authoritative record applies only to the specifically identified person — never transfer behavioral characteristics to the queried subject without confirmed identity match.
- contradictionsAndInconsistencies must contain ONLY actual conflicting data between two or more sources. Examples of real contradictions: different dates of birth, incompatible addresses, mismatched photographs, impossible timelines, conflicting company roles.
- A common name matching a wanted record is IDENTITY AMBIGUITY or NAME COLLISION — place it in possibleAssociations, NOT contradictionsAndInconsistencies.
- IDENTITY AMBIGUITY: the available data may refer to multiple individuals — place in possibleAssociations.
- NAME COLLISION: the same name is associated with unrelated records — place in possibleAssociations or informationGaps.
- CONTRADICTION: two or more findings contain genuinely incompatible information — place in contradictionsAndInconsistencies.
- Do not manufacture contradictions from normal uncertainty.
UNSUPPORTED INFERENCE GUARD (apply before finalizing any conclusion, identity match, or risk indicator):
- Never convert a match, association, or risk indicator into a confirmed identity or conclusion without sufficient supporting evidence.
- A name match, partial identifier overlap, or single-source hit is NOT sufficient on its own to confirm identity or elevate a finding to CONFIRMED.
- Before stating any conclusion, ask: does the evidence independently establish this, or does it only make this plausible? If only plausible, use POSSIBLE ASSOCIATION or REQUIRES_VERIFICATION, never CONFIRMED.
- If a finding could only be elevated to a stronger classification with information you do not have, state explicitly what is missing rather than assuming it in the subject's favor or against them.
- When in doubt between two classification levels, choose the more conservative (less certain) one and state why in the relevant explanation field.

CONFIDENCE MODEL 2.0 (apply when setting any confidence value — identityConfidence, evidenceStrength, overallConfidence, or per-finding confidence):
Derive confidence from these factors together, not from a single strong signal:
1. Evidence quantity — how many independent data points support the claim
2. Evidence quality — source authority (AUTHORITATIVE > PUBLIC_RECORD > COMMERCIAL_DATABASE > OPEN_WEB) and directness (source-confirmed vs. inferred)
3. Source independence — do multiple sources corroborate independently, or do they trace back to the same underlying record?
4. Contradictions — do any findings conflict, and how significant is the conflict?
5. Identity certainty — how strongly is this specific finding tied to the verified subject, versus a same-name or partial match?
HIGH confidence requires: multiple independent authoritative sources, no unresolved contradictions, and strong identity linkage.
MEDIUM confidence: some corroboration but either single-source, moderate source quality, or minor unresolved ambiguity.
LOW confidence: single weak source, significant identity ambiguity, or unresolved contradictions present.
INSUFFICIENT: not enough evidence of any quality to assess.
AI GAP PRIORITIZATION 2.0 (apply when assigning priority to each information gap):
Priority must reflect impact, not just category. For each gap, assess:
- What would change in identityConfidence, operationalRiskStatus, or a specific risk indicator if this gap were resolved?
- Is this gap blocking a decision the user needs to make before contact, or is it background context?
- Could resolving this gap eliminate or confirm a specific contradiction or possible association?
CRITICAL = resolving it would materially change identity confidence or risk status, or is required before safe contact.
IMPORTANT = resolving it would strengthen or clarify an existing finding, but does not block a go/no-go decision.
USEFUL = adds context but does not affect confidence or risk assessment.
DYNAMIC NEXT BEST ACTION 2.0 (apply when determining immediateVerificationRequirement and the first step in researchPlan.steps):
Do not default to the most obvious or most commonly recommended action. Instead, evaluate candidate next actions against how much each would reduce uncertainty:
- Which unresolved question, if answered, would most change identityConfidence or operationalRiskStatus?
- Which action addresses a CRITICAL information gap rather than an IMPORTANT or USEFUL one?
- Which action is achievable with information already available (e.g. an identifier already in hand) versus one that depends on data not yet collected?
Prefer the action that resolves the single highest-impact uncertainty over one that is merely procedurally "next in sequence." BRIEF QUALITY CONTROL 2.0 (final check before producing JSON output — apply after all sections are drafted):
- Cross-check consistency: does the same finding receive the same classification (SOURCE_CONFIRMED/SUPPORTED/etc.) everywhere it appears — in confirmedAndSupportedInformation, evidenceClassifier, and preContactOverview? Fix any mismatch before output.
- Does identityConfidence.level match the reasoning in identityConfidence.basis? A HIGH confidence label with a basis describing only a single weak identifier is inconsistent — resolve the mismatch by adjusting the label, not the reasoning.
- Does operationalRiskStatus match the actual contents of potentialRiskIndicators? LOW_INDICATED_RISK with a HIGH severity indicator present is inconsistent.
- Is every recommended action in recommendedChecksBeforeContact and researchPlan.steps traceable to a specific gap or uncertainty documented elsewhere in the brief — not a generic boilerplate recommendation?
- Does confidenceAndLimitations.basis restate the actual evidence used, or is it a generic phrase that could apply to any brief? Replace generic language with case-specific detail.
RESEARCH PLANNER 2.0 (apply when building researchPlan.steps):
- Order steps by dependency, not just by module convention: if step B's value depends on what step A reveals (e.g. confirming an address before checking property records at that address), state that dependency explicitly in step B's "reason" field.
- Avoid listing a step that duplicates information already available in the findings — check confirmedAndSupportedInformation and knownInformation before recommending a search that would only reconfirm what is already known.
- Each step's expectedOutcome must state what specific uncertainty it resolves, referencing the relevant gap or ambiguity by content, not a generic description like "gathers more information."
- identifierStrength must reflect what is actually usable for search, not just what was provided — e.g. a common first-and-last name alone is WEAK regardless of how much surrounding context exists, unless a distinguishing identifier (DOB, address, phone) is also present.
- If the identifier is INSUFFICIENT for reliable research, say so plainly in sequenceSummary rather than producing a full step-by-step plan that implies confidence the data doesn't support.

ROLE-BASED ASSESSMENT TEMPLATE (apply based on the user's stated professional role — this affects emphasis, prioritization in recommendedIntelligencePath and operationalConsiderations, but never changes evidentiary standards):
The user's professional role for this assessment: ${professionalRole || 'Not specified'}
- Private Investigator: balanced general-purpose emphasis across identity, location, associations, and background — no single area should dominate unless findings specifically warrant it.
- Executive Protection: prioritize operationalConsiderations around physical risk, behavioral/threat indicators (only if evidence-supported — never speculate), known associates, weapons or violence history if present in sources, and travel/location patterns. Prioritize recommendedIntelligencePath modules covering criminal records, wanted/sanctions checks, and known addresses.
- Process Server: prioritize identity confidence and current, verifiable address/location data above all else — the operational goal is successful, safe, legally sound service. De-prioritize deep background/financial modules unless directly relevant to locating the subject. Flag any indicators of evasiveness or address instability as high-priority gaps.
- Bail/Fugitive Recovery: prioritize current location indicators, known associates, vehicle records, travel patterns, and any recent activity signals. Treat identity confidence as especially critical given legal stakes — do not soften language around unresolved identity ambiguity.
- Corporate Security: prioritize employment history, professional associations, public records related to conduct (litigation, regulatory actions), and any indicators relevant to workplace risk. Avoid drawing conclusions about character from limited data.
- Due Diligence: prioritize corporate affiliations, financial/regulatory records, litigation history, sanctions/watchlist status, and professional licensing. This role most benefits from the manualSourceGuidance and recommendedIntelligencePath sections being thorough on corporate/financial sources.
- Corporate Investigation: prioritize professional history, internal-conduct-relevant public records, and associations with named entities or individuals relevant to the specific matter under investigation.
- Not specified / Other: use general-purpose balanced emphasis as with Private Investigator; do not assume a role's priorities without one being stated.

CASE- AND PURPOSE-AWARE SOURCE RECONCILIATION, QUERY BUILDER & MANUAL SOURCE ASSISTANT (apply using the caseContext, assessmentPurpose, and professionalRole provided above):
- Source Reconciliation: before explaining a conflict between sources, check whether it relates to something already listed in confirmedFindings or rejectedAssociations (from case context). If so, state that directly in possibleExplanation (e.g. "This aligns with the address already confirmed by the user" or "This matches an association the user has already ruled out") rather than re-deriving the explanation from scratch.
- Query Builder (queryVariations): tailor booleanSuggestions and searchOptimizations to the stated professionalRole and assessmentPurpose, not just the identifier itself. Due Diligence/Corporate Investigation → emphasize corporate/financial terms (company names, jurisdictions, filing types). Process Server → emphasize current address and location-verification terms. Executive Protection/Bail-Fugitive Recovery → emphasize criminal-record and location/travel terms. If role/purpose is not specified, keep suggestions general-purpose.
- Manual Source Assistant (manualSourceGuidance): prioritize and select sources most relevant to the stated role. Due Diligence/Corporate Investigation → prioritize corporate registries, financial/regulatory sources, litigation databases. Process Server → prioritize address, property, and utility-verification sources. Bail/Fugitive Recovery/Executive Protection → prioritize wanted lists, sanctions checks, and criminal-record sources. Corporate Security → prioritize professional/employment and conduct-related public records. If role/purpose is not specified, use general-purpose balanced source selection as elsewhere in this prompt.

Respond ONLY with valid JSON. No markdown, no preamble, no explanation outside JSON.`;

  const caseContextText = caseContext ? `
CASE CONTEXT (already known from previous sessions):
- Previous searches completed: ${caseContext.previousSearches?.join(', ') || 'none'}
- User-confirmed findings: ${caseContext.confirmedFindings?.join('; ') || 'none'}
- Rejected associations: ${caseContext.rejectedAssociations?.join('; ') || 'none'}
- Resolved information gaps: ${caseContext.resolvedGaps?.join('; ') || 'none'}
- User notes: ${caseContext.userNotes || 'none'}

Do NOT re-suggest searches already completed. Do NOT re-flag associations already rejected by the user. Build on confirmed findings rather than re-establishing them.

POST-CONTACT UPDATE INSTRUCTIONS (if post-contact observations are provided):
- Compare new observations against the pre-contact brief.
- Identify which findings are now supported, contradicted, or updated.
- Note any new identifiers or associations discovered during contact.
- Update identity confidence if new evidence supports or contradicts prior assessment.
- Flag any discrepancies between pre-contact brief and post-contact observations.
- Never treat post-contact user observations as source-confirmed without corroboration.` : '';

  const user = `Generate a Pre-Contact Intelligence Brief for the following subject/query.

QUERY: ${query}
INPUT TYPE: ${inputType}
ASSESSMENT PURPOSE: ${assessmentPurpose || 'Not specified'}
PROFESSIONAL ROLE: ${professionalRole || 'Not specified'}
${caseContextText}

INTELLIGENCE FINDINGS:
${findingsText}

Respond with this exact JSON structure:
{
  "subjectQuery": "${query}",
  "inputType": "${inputType}",
  "briefTimestamp": "<ISO timestamp>",
  "preContactOverview": {
    "identityConfidence": "<HIGH|MEDIUM|LOW|INSUFFICIENT>",
    "operationalRiskStatus": "<LOW_INDICATED_RISK|REQUIRES_VERIFICATION|REQUIRES_IDENTITY_VERIFICATION|ELEVATED_CAUTION|NOT_DETERMINED|INSUFFICIENT_IDENTIFIERS>",
    "primaryFinding": "<one or two sentences describing the most important finding — be specific, not generic>",
    "immediateVerificationRequirement": "<the single most important thing to verify before contact>",
    "evidenceStrength": "<HIGH|MEDIUM|LOW>",
    "researchReadiness": {
      "identityVerification": "<COMPLETE|PARTIALLY_COMPLETE|INCOMPLETE|NOT_APPLICABLE>",
      "riskScreening": "<COMPLETE|PARTIALLY_COMPLETE|INCOMPLETE|NOT_APPLICABLE>",
      "publicRecords": "<COMPLETE|PARTIALLY_COMPLETE|INCOMPLETE|NOT_APPLICABLE>",
      "companyVerification": "<COMPLETE|PARTIALLY_COMPLETE|INCOMPLETE|NOT_APPLICABLE>",
      "contradictionReview": "<COMPLETE|PARTIALLY_COMPLETE|INCOMPLETE|NOT_APPLICABLE>",
      "preContactReadiness": "<READY|ADDITIONAL_IDENTIFIERS_REQUIRED|VERIFICATION_REQUIRED|INSUFFICIENT_DATA>"
    }
  },
  "identityConfidence": {
    "level": "<HIGH|MEDIUM|LOW|INSUFFICIENT>",
    "basis": "<what evidence supports this confidence level — be specific, not generic>",
    "explanation": "<plain-language explanation of why confidence is at this level, e.g. Name, DOB, and phone align across three independent sources — HIGH. OR: Only a name was provided, which is common and shared by many individuals — INSUFFICIENT.>",
    "whatWouldIncreaseConfidence": "<the single most impactful identifier that would raise confidence>",
    "uncertainties": ["<uncertainty 1>", "<uncertainty 2>"]
  },
  "confirmedAndSupportedInformation": [
    {
      "id": "<unique-id e.g. cf_001>",
      "contentType": "confirmedFact",
      "statement": "<source-confirmed or user-confirmed finding>",
      "source": "<source name>",
      "sourceType": "<AUTHORITATIVE|PUBLIC_RECORD|COMMERCIAL_DATABASE>",
      "confidence": "<SOURCE_CONFIRMED|SUPPORTED|PROBABLE>",
      "verificationStatus": "<CONFIRMED|REVIEWED|UNVERIFIED>",
      "whyItMatters": "<relevance to the assessment>"
    }
  ],
  "possibleAssociations": [
    {
      "id": "<unique-id e.g. pa_001>",
      "contentType": "possibleAssociation",
      "statement": "<possible but unconfirmed association>",
      "whyIdentified": "<reason this was flagged>",
      "confidence": "<PROBABLE|POSSIBLE|UNCERTAIN>",
      "missingIdentifiers": "<what would confirm or reject this>",
      "recommendedVerification": "<suggested action>",
      "alternativeExplanation": "<another plausible reading>"
    }
  ],
  "knownInformation": [
    { "finding": "<confirmed finding>", "source": "<source name>", "confidence": "<CONFIRMED|PROBABLE|UNVERIFIED>" }
  ],
  "potentialRiskIndicators": [
    {
      "id": "<unique-id e.g. ri_001>",
      "contentType": "potentialRiskIndicator",
      "indicator": "<risk description>",
      "category": "<CRIMINAL|SANCTIONS|FINANCIAL|IDENTITY|REPUTATIONAL|LOCATION|VEHICLE|BREACH>",
      "severity": "<HIGH|MEDIUM|LOW>",
      "status": "<CONFIRMED|POSSIBLE|REQUIRES_VERIFICATION>",
      "sourceReferences": ["<source name 1>", "<source name 2>"],
      "evidentiaryBasis": "<what evidence supports this indicator>",
      "identityRelevance": "<CONFIRMED_FOR_SUBJECT|REQUIRES_IDENTITY_VERIFICATION|NOT_APPLICABLE>",
      "alternativeExplanation": "<another plausible reading if applicable>"
    }
  ],
  "contradictionsAndInconsistencies": [
    {
      "id": "<unique-id e.g. co_001>",
      "contentType": "contradiction",
      "contradictionType": "<DATA_CONFLICT|TIMELINE_INCONSISTENCY|IDENTITY_MISMATCH|SOURCE_DISAGREEMENT>",
      "description": "<what specifically conflicts — cite exact data points>",
      "sourceA": { "name": "<source name>", "claim": "<what source A says>" },
      "sourceB": { "name": "<source name>", "claim": "<what source B says>" },
      "significance": "<HIGH|MEDIUM|LOW>",
      "possibleExplanation": "<could this be explained by record age, data entry error, or different time periods?>",
      "affectedFindings": ["<finding id 1>"],
      "recommendedResolution": "<specific step to resolve — e.g. obtain official DOB document>"
    }
  ],
  "informationGaps": [
    {
      "id": "<unique-id e.g. ig_001>",
      "gap": "<what is missing>",
      "priority": "<CRITICAL|IMPORTANT|USEFUL>",
      "priorityReason": "<why this priority — what does resolving it enable or prevent>",
      "impact": "<IDENTITY_VERIFICATION|RISK_ASSESSMENT|OPERATIONAL_PLANNING|ADDITIONAL_CONTEXT>",
      "importance": "<HIGH|MEDIUM|LOW>",
      "suggestedCheck": "<specific recommended action>",
      "status": "<NOT_ASSESSED|PENDING|RESOLVED|UNAVAILABLE>"
    }
  ],
  "recommendedChecksBeforeContact": [
    { "module": "<Sentinel module name>", "reason": "<why this check is recommended>", "priority": "<HIGH|MEDIUM|LOW>" }
  ],
  "operationalConsiderations": [
    "<consideration 1>",
    "<consideration 2>"
  ],
  "queryVariations": {
    "nameVariations": ["<full legal name>", "<common nickname>", "<maiden name if applicable>", "<name with middle initial>"],
    "searchOptimizations": [
      { "field": "<e.g. phone>", "variations": ["<format 1>", "<format 2>"], "reason": "<why these variations matter>" }
    ],
    "booleanSuggestions": ["<e.g. "Robert Fisher" AND Arizona>", "<e.g. "R.W. Fisher" OR "Robert W. Fisher">"],
    "excludeTerms": ["<terms that would generate irrelevant results>"]
  },
  "researchPlan": {
    "sequenceSummary": "<one sentence explaining the overall research strategy for this identifier>",
    "identifierStrength": "<STRONG|MODERATE|WEAK|INSUFFICIENT>",
    "identifierStrengthReason": "<why the identifier is strong or weak for intelligence purposes>",
    "steps": [
      {
        "stepNumber": 1,
        "title": "<short step title e.g. Verify Phone Ownership>",
        "modules": ["<Sentinel module name>"],
        "reason": "<why this step comes first — use cautious language>",
        "expectedOutcome": "<what this step should establish or rule out>",
        "status": "<COMPLETED|RECOMMENDED|OPTIONAL>"
      }
    ]
  },
  "manualSourceGuidance": [
    {
      "sourceName": "<official source name e.g. OFAC SDN List>",
      "sourceType": "<OFFICIAL_GOVERNMENT|COURT_RECORD|REGULATORY_REGISTRY|COMMERCIAL|OTHER>",
      "why": "<why this source is relevant to this specific assessment>",
      "steps": [
        "<step 1: specific action e.g. Go to sanctionssearch.ofac.treas.gov>",
        "<step 2: specific action e.g. Enter full legal name and search>",
        "<step 3: specific action e.g. Note result as Confirmed Match, No Match, or Possible Match>"
      ],
      "whatToRecord": "<what the user should note from this source>",
      "priority": "<HIGH|MEDIUM|LOW>"
    }
  ],
  "recommendedIntelligencePath": [
    {
      "module": "<Sentinel module name>",
      "priority": "<HIGH|MEDIUM|LOW>",
      "reason": "<why this module is recommended — use cautious language: appears to be, may be relevant, requires verification>",
      "status": "<RAN_AUTOMATICALLY|RECOMMENDED_MANUAL|OPTIONAL>",
      "expectedContribution": "<what specific question this module can answer or rule out>",
      "identifierRequired": "<what the user needs to run this module e.g. DOB, phone number, address>",
      "linkedGap": "<id of the information gap this module addresses, if any>"
    }
  ],
  "identityResolution": {
    "assessment": "<LIKELY_SAME_PERSON|POSSIBLY_SAME_PERSON|INCONCLUSIVE|POSSIBLY_DIFFERENT_PEOPLE|LIKELY_DIFFERENT_PEOPLE>",
    "supportingFactors": ["<factor supporting same identity e.g. matching city and phone region>"],
    "conflictingFactors": ["<factor suggesting different identity e.g. incompatible age range>"],
    "conclusion": "<plain-language conclusion — use cautious language, never confirm identity without biometric or official document verification>",
    "minimumRequiredToConfirm": "<what single identifier would most reliably confirm or exclude identity>"
  },
  "aiAssistedInterpretation": [
    { "statement": "<AI-derived analytical interpretation — NOT source-confirmed>", "findingsUsed": ["<finding reference>"], "confidence": "<HIGH|MEDIUM|LOW>", "uncertainty": "<what makes this uncertain>", "alternativeInterpretation": "<another plausible reading>", "requiresProfessionalReview": true }
  ],
  "evidenceClassifier": [
    {
      "findingId": "<reference to a finding id e.g. cf_001 or ri_001>",
      "statement": "<the specific claim being classified>",
      "classification": "<SOURCE_CONFIRMED|SUPPORTED|POSSIBLE_ASSOCIATION|USER_PROVIDED|POTENTIAL_RISK_INDICATOR|IDENTITY_AMBIGUITY|CONTRADICTION|INFORMATION_GAP|AI_ASSISTED_INTERPRETATION|NOT_ASSESSED>",
      "sourceReferences": ["<source name 1>", "<source name 2>"],
      "sourceTypes": ["<AUTHORITATIVE|PUBLIC_RECORD|COMMERCIAL_DATABASE|OPEN_WEB|AI_SYNTHESIS>"],
      "retrievalStatus": "<RETRIEVED|NOT_EXECUTED|FAILED|REQUIRES_MANUAL>",
      "associationStatus": "<CONFIRMED_FOR_SUBJECT|POSSIBLE_MATCH|UNVERIFIED|NOT_APPLICABLE>",
      "verificationRequirement": "<what must be done to confirm or reject this claim>"
    }
  ],
  "confidenceAndLimitations": {
    "overallConfidence": "<HIGH|MEDIUM|LOW>",
    "basis": "<what this brief is based on>",
    "limitations": ["<limitation 1>", "<limitation 2>"],
    "disclaimer": "This brief is based on available open-source intelligence at the time of query. All findings require professional verification before operational use."
  }
}

Status values: RAN_AUTOMATICALLY = ran as part of this search, RECOMMENDED_MANUAL = user should run this manually, OPTIONAL = may provide additional context.

Operational Risk Status logic:
- LOW_INDICATED_RISK: identity confidently matched, no meaningful risk indicators found
- REQUIRES_VERIFICATION: identity possible but unconfirmed, some indicators present
- REQUIRES_IDENTITY_VERIFICATION: identity uncertain, serious name-based risk indicators exist
- ELEVATED_CAUTION: confirmed risk indicators regardless of identity confidence
- NOT_DETERMINED: insufficient data to assess risk meaningfully
- INSUFFICIENT_IDENTIFIERS: query does not provide enough to assess risk`;

  await AuditLog.log('SEARCH_QUERY', `AI Pre-Contact Brief: ${query}`);
  return await callClaude(system, user);
}

// ─── Version Change Summary ────────────────────────────────────────────────

export async function generateVersionChangeSummary(
  previousBrief: any,
  currentBrief: any
): Promise<string> {
  const previousText = JSON.stringify({
    identityConfidence: previousBrief?.preContactOverview?.identityConfidence,
    operationalRiskStatus: previousBrief?.preContactOverview?.operationalRiskStatus,
    riskIndicators: previousBrief?.potentialRiskIndicators,
    informationGaps: previousBrief?.informationGaps,
    contradictions: previousBrief?.contradictionsAndInconsistencies,
    confirmedInfo: previousBrief?.confirmedAndSupportedInformation,
  }, null, 2);
  const currentText = JSON.stringify({
    identityConfidence: currentBrief?.preContactOverview?.identityConfidence,
    operationalRiskStatus: currentBrief?.preContactOverview?.operationalRiskStatus,
    riskIndicators: currentBrief?.potentialRiskIndicators,
    informationGaps: currentBrief?.informationGaps,
    contradictions: currentBrief?.contradictionsAndInconsistencies,
    confirmedInfo: currentBrief?.confirmedAndSupportedInformation,
  }, null, 2);

  const system = `You are a senior field intelligence analyst summarizing what changed between two versions of a Pre-Contact Intelligence Brief for the same subject.
Follow the same terminology and evidentiary discipline as brief generation itself:
- Never state a change is more significant than the evidence supports.
- Distinguish between a change in confirmed facts versus a change in AI interpretation or confidence level.
- If nothing operationally significant changed, say so plainly rather than manufacturing significance.
- Use terms consistently: SOURCE CONFIRMED, SUPPORTED, POSSIBLE ASSOCIATION, REQUIRES VERIFICATION.
Be concise — this is read quickly by a field professional deciding whether to re-review the full brief.`;

  const user = `Compare these two versions of a Pre-Contact Intelligence Brief and summarize what changed and why it matters operationally.

PREVIOUS VERSION (relevant fields):
${previousText}

CURRENT VERSION (relevant fields):
${currentText}

Write a short summary (3-6 sentences, plain prose, no headers) covering:
1. What specifically changed (new findings, resolved gaps, changed confidence, new/resolved contradictions)
2. Why each change matters — what it means for identity confidence or risk assessment
3. If nothing meaningful changed beyond superficial differences, state that clearly instead of inventing significance

Do not use markdown formatting. Do not repeat raw field names like "operationalRiskStatus" — describe changes in plain language a field investigator would use.`;

  await AuditLog.log('SEARCH_QUERY', 'AI Version Change Summary');
  return await callClaude(system, user);
}

// ─── Objectivity Validation ─────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateBrief(brief: any): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Check identity confidence is not conflated with risk
  if (brief.preContactOverview?.operationalRiskStatus === 'LOW_INDICATED_RISK' &&
      brief.preContactOverview?.identityConfidence !== 'HIGH') {
    warnings.push('Low risk status with low identity confidence — risk cannot be determined without identity verification.');
  }

  // 2. Check AI interpretation is separate from confirmed information
  if (brief.confirmedAndSupportedInformation?.some((item: any) =>
    item.confidence === 'AI_INTERPRETATION' || item.sourceType === 'AI'
  )) {
    errors.push('AI interpretation found in confirmed information section — must be moved to AI-Assisted Interpretation.');
  }

  // 3. Check that serious risk indicators have verification status
  const unverifiedHighRisk = brief.potentialRiskIndicators?.filter((r: any) =>
    r.severity === 'HIGH' && !r.status
  );
  if (unverifiedHighRisk?.length > 0) {
    warnings.push(`${unverifiedHighRisk.length} HIGH severity risk indicator(s) missing verification status.`);
  }

  // 4. Check that information gaps are present when identity confidence is low
  if (brief.preContactOverview?.identityConfidence === 'LOW' &&
      (!brief.informationGaps || brief.informationGaps.length === 0)) {
    warnings.push('Low identity confidence but no information gaps identified — gaps should be documented.');
  }

  // 5. Check that operational risk status is not empty
  if (!brief.preContactOverview?.operationalRiskStatus) {
    errors.push('Operational risk status is missing — cannot display brief without risk assessment.');
  }

  // 6. Check that primary finding is specific
  if (brief.preContactOverview?.primaryFinding &&
      brief.preContactOverview.primaryFinding.length < 20) {
    warnings.push('Primary finding appears too brief — may not provide sufficient operational context.');
  }

  // 7. Check disclaimer is present
  if (!brief.confidenceAndLimitations?.disclaimer) {
    warnings.push('Confidence and limitations disclaimer is missing.');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}
