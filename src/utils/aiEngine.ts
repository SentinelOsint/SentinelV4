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

// ─── Pre-Contact Intelligence Brief ────────────────────────────────────────

export async function generatePreContactBrief(
  query: string,
  inputType: string,
  findings: OsintResult[]
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
Respond ONLY with valid JSON. No markdown, no preamble, no explanation outside JSON.`;

  const user = `Generate a Pre-Contact Intelligence Brief for the following subject/query.

QUERY: ${query}
INPUT TYPE: ${inputType}

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
    "basis": "<what evidence supports this confidence level>",
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
      "description": "<what conflicts>",
      "sources": ["<source A>", "<source B>"],
      "significance": "<HIGH|MEDIUM|LOW>",
      "affectedFindings": ["<finding id 1>"],
      "recommendedResolution": "<how to resolve this contradiction>"
    }
  ],
  "informationGaps": [
    { "gap": "<what is missing>", "importance": "<HIGH|MEDIUM|LOW>", "suggestedCheck": "<how to address this>" }
  ],
  "recommendedChecksBeforeContact": [
    { "module": "<Sentinel module name>", "reason": "<why this check is recommended>", "priority": "<HIGH|MEDIUM|LOW>" }
  ],
  "operationalConsiderations": [
    "<consideration 1>",
    "<consideration 2>"
  ],
  "recommendedIntelligencePath": [
    {
      "module": "<Sentinel module name>",
      "priority": "<HIGH|MEDIUM|LOW>",
      "reason": "<why this module is recommended — use cautious language: appears to be, may be relevant, requires verification>",
      "status": "<RAN_AUTOMATICALLY|RECOMMENDED_MANUAL|OPTIONAL>"
    }
  ],
  "aiAssistedInterpretation": [
    { "statement": "<AI-derived analytical interpretation — NOT source-confirmed>", "findingsUsed": ["<finding reference>"], "confidence": "<HIGH|MEDIUM|LOW>", "uncertainty": "<what makes this uncertain>", "alternativeInterpretation": "<another plausible reading>", "requiresProfessionalReview": true }
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
