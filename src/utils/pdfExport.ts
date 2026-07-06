/**
 * SENTINEL – PDF Export Utility
 *
 * Generates professional PDF reports for:
 * 1. Single search results (exportSearchPDF)
 * 2. Full case reports (exportCasePDF)
 *
 * Uses expo-print for rendering and expo-sharing for delivery.
 */

import * as Print   from 'expo-print';
import * as Sharing from 'expo-sharing';
import { OsintResult, CaseReport } from '../types';

// ── Shared styles ─────────────────────────────────────────────────────────────
const CSS = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; }
  .page { padding: 40px; max-width: 780px; margin: 0 auto; }
  .header { border-bottom: 3px solid #1a2535; padding-bottom: 20px; margin-bottom: 28px; }
  .logo { font-size: 28px; font-weight: 900; color: #0a1628; letter-spacing: 6px; }
  .logo-sub { font-size: 11px; color: #6b7c93; letter-spacing: 3px; margin-top: 4px; }
  .report-title { font-size: 20px; font-weight: 700; color: #0a1628; margin-top: 16px; }
  .meta-row { display: flex; gap: 24px; margin-top: 10px; flex-wrap: wrap; }
  .meta-item { font-size: 12px; color: #6b7c93; }
  .meta-item strong { color: #1a2535; }
  .section-header { background: #f0f4f8; padding: 8px 14px; font-size: 10px; font-weight: 700; color: #4a5c72; letter-spacing: 2px; text-transform: uppercase; margin-top: 20px; border-radius: 4px; }
  .result-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e8edf5; }
  .result-label { font-size: 10px; color: #6b7c93; text-transform: uppercase; letter-spacing: 0.8px; width: 160px; flex-shrink: 0; padding-top: 2px; }
  .result-value { font-size: 13px; color: #1a2535; flex: 1; word-break: break-word; }
  .result-link { color: #1a6fb5; font-size: 13px; }
  .warn-row { background: #fff8e1; border-left: 4px solid #f39c12; padding: 10px 14px; margin: 8px 0; border-radius: 0 4px 4px 0; font-size: 13px; color: #7d5a00; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
  .badge-green  { background: #d4edda; color: #155724; }
  .badge-amber  { background: #fff3cd; color: #856404; }
  .badge-red    { background: #f8d7da; color: #721c24; }
  .badge-gray   { background: #e2e8f0; color: #4a5c72; }
  .case-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .note-card { background: #f8fafd; border-left: 3px solid #9b59b6; padding: 10px 14px; margin: 8px 0; border-radius: 0 4px 4px 0; }
  .note-tag  { font-size: 10px; font-weight: 700; color: #9b59b6; letter-spacing: 1px; text-transform: uppercase; }
  .note-time { font-size: 10px; color: #6b7c93; margin-left: 10px; }
  .note-text { font-size: 13px; color: #1a2535; margin-top: 4px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #9bb0c4; text-align: center; }
  h3 { font-size: 15px; color: #1a2535; margin-bottom: 8px; margin-top: 0; }
  .disclaimer { background: #fffbeb; border: 1px solid #f39c12; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #7d5a00; margin-top: 20px; }
`;

const footer = () => `
  <div class="footer">
    SENTINEL OSINT Field Toolkit · Generated ${new Date().toLocaleString('en-US')} · Not a CRA · Not for employment/credit/tenant screening
  </div>
`;

// ── 1. Search Result PDF ──────────────────────────────────────────────────────
export async function exportSearchPDF(
  module: string,
  query: string,
  results: OsintResult[]
): Promise<void> {
  const reportId = `SNT-${Date.now().toString(36).toUpperCase()}`;
  const generatedAt = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
  const rows = results.map(r => {
    if (r.type === 'info') return `<div class="section-header">${r.label}</div>`;
    if (r.type === 'warn') return `<div class="warn-row">⚠️ ${r.value}</div>`;
    if (r.type === 'link') return `
      <div class="result-row">
        <div class="result-label">${r.label}</div>
        <div class="result-value">
          <a href="${r.value}" class="result-link">${r.label}</a><br/>
          <span style="font-size:10px;color:#9bb0c4;">${r.value}</span><br/>
          <span style="font-size:9px;color:#6b7fa3;">Source: ${module} · Retrieved: ${generatedAt}</span>
        </div>
      </div>`;
    return `
      <div class="result-row">
        <div class="result-label">${r.label}</div>
        <div class="result-value">
          ${r.value}
          <span style="font-size:9px;color:#6b7fa3;display:block;">Source: ${module}</span>
        </div>
      </div>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${CSS}</style></head><body>
    <div class="page">
      <div class="header">
        <div class="logo">SENTINEL</div>
        <div class="logo-sub">FIELD INTELLIGENCE PLATFORM · NORTH AMERICA EDITION</div>
        <div class="report-title">${module} Report</div>
        <div class="meta-row">
          <div class="meta-item"><strong>Report ID:</strong> ${reportId}</div>
          <div class="meta-item"><strong>Query:</strong> ${query}</div>
          <div class="meta-item"><strong>Module:</strong> ${module}</div>
          <div class="meta-item"><strong>Generated:</strong> ${generatedAt}</div>
          <div class="meta-item"><strong>Results:</strong> ${results.filter(r => r.type !== 'info' && r.type !== 'warn').length} items</div>
          <div class="meta-item"><strong>Generated by:</strong> Sentinel OSINT Toolkit v2.5.0</div>
        </div>
      </div>
      ${rows}
      <div class="disclaimer">⚖️ This report was generated using publicly available information. Not a CRA. Not for employment, credit, insurance, or tenant screening. Use in compliance with DPPA and applicable laws.</div>
      ${footer()}
    </div>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${module} Report` });
}

// ── 2. Case Report PDF ────────────────────────────────────────────────────────
export async function exportCasePDF(caseData: CaseReport): Promise<void> {
  const statusClass = caseData.status === 'active' ? 'badge-green' : caseData.status === 'pending' ? 'badge-amber' : 'badge-gray';
  const priorityClass = caseData.priority === 'high' ? 'badge-red' : caseData.priority === 'medium' ? 'badge-amber' : 'badge-green';

  const searchRows = caseData.searches.slice(0, 100).map(s => `
    <div class="result-row">
      <div class="result-label">${s.module}</div>
      <div class="result-value">${s.query} <span style="font-size:10px;color:#9bb0c4;">· ${s.timestamp}</span></div>
    </div>`).join('');

  const noteRows = caseData.notes.map(n => `
    <div class="note-card">
      <span class="note-tag">${n.tag}</span><span class="note-time">${n.timestamp}</span>
      <div class="note-text">${n.text}</div>
    </div>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${CSS}</style></head><body>
    <div class="page">
      <div class="header">
        <div class="logo">SENTINEL</div>
        <div class="logo-sub">FIELD INTELLIGENCE PLATFORM · CASE REPORT</div>
        <div class="report-title">${caseData.title}</div>
        <div class="meta-row">
          <div class="meta-item"><strong>Case ID:</strong> ${caseData.id}</div>
          <div class="meta-item"><strong>Status:</strong> <span class="badge ${statusClass}">${caseData.status.toUpperCase()}</span></div>
          <div class="meta-item"><strong>Priority:</strong> <span class="badge ${priorityClass}">${caseData.priority.toUpperCase()}</span></div>
          <div class="meta-item"><strong>Created:</strong> ${caseData.createdAt}</div>
          <div class="meta-item"><strong>Updated:</strong> ${caseData.updatedAt}</div>
        </div>
      </div>

      <h3>Case Overview</h3>
      <div class="case-card">
        ${caseData.subject    ? `<div class="result-row"><div class="result-label">Subject</div><div class="result-value">${caseData.subject}</div></div>` : ''}
        ${caseData.location   ? `<div class="result-row"><div class="result-label">Location</div><div class="result-value">${caseData.location}</div></div>` : ''}
        ${caseData.description? `<div class="result-row"><div class="result-label">Description</div><div class="result-value">${caseData.description}</div></div>` : ''}
        ${caseData.tags.length? `<div class="result-row"><div class="result-label">Tags</div><div class="result-value">${caseData.tags.join(' · ')}</div></div>` : ''}
      </div>

      <div class="section-header">RESEARCH LOG (${caseData.searches.length} Searches)</div>
      ${searchRows || '<div style="padding:12px 0;color:#9bb0c4;font-size:13px;">No searches recorded.</div>'}

      <div class="section-header">FIELD NOTES (${caseData.notes.length} Entries)</div>
      ${noteRows || '<div style="padding:12px 0;color:#9bb0c4;font-size:13px;">No notes recorded.</div>'}

      <div class="disclaimer">⚖️ This report contains privileged investigative work product. Not a CRA. Not for employment, credit, insurance, or tenant screening. Use in compliance with DPPA and applicable laws.</div>
      ${footer()}
    </div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Case Report – ${caseData.title}` });
}

// ── Investigation Report (Report Templates) ───────────────────────────────────
export interface ReportTemplate {
  caseData:       CaseReport;
  clientName?:    string;
  clientRef?:     string;
  invoiceRef?:    string;
  investigator?:  string;
  firmName?:      string;
  licenseNumber?: string;
  aiSummary?:     string;
  keyFindings?:   string[];
  timeline?:      { timestamp: string; event: string; module: string }[];
}

export async function exportInvestigationReport(t: ReportTemplate): Promise<void> {
  const { caseData } = t;
  const statusClass   = caseData.status   === 'active'  ? 'badge-green' : caseData.status   === 'pending' ? 'badge-amber' : 'badge-gray';
  const priorityClass = caseData.priority === 'high'    ? 'badge-red'   : caseData.priority === 'medium'  ? 'badge-amber' : 'badge-green';

  const clientBlock = (t.clientName || t.clientRef || t.invoiceRef) ? `
    <div class="section-header">CLIENT INFORMATION</div>
    <div class="case-card">
      ${t.clientName  ? `<div class="result-row"><div class="result-label">Client</div><div class="result-value">${t.clientName}</div></div>` : ''}
      ${t.clientRef   ? `<div class="result-row"><div class="result-label">Reference</div><div class="result-value">${t.clientRef}</div></div>` : ''}
      ${t.invoiceRef  ? `<div class="result-row"><div class="result-label">Invoice Ref</div><div class="result-value">${t.invoiceRef}</div></div>` : ''}
    </div>` : '';

  const aiBlock = t.aiSummary ? `
    <div class="section-header">AI EXECUTIVE SUMMARY</div>
    <div class="case-card" style="background:#f8fafd;border-left:4px solid #1a6fb5;">
      <div style="font-size:13px;color:#1a2535;line-height:1.7;white-space:pre-wrap;">${t.aiSummary}</div>
    </div>` : '';

  const findingsBlock = t.keyFindings && t.keyFindings.length > 0 ? `
    <div class="section-header">KEY FINDINGS (${t.keyFindings.length})</div>
    <div class="case-card">
      ${t.keyFindings.map((f, i) => `
        <div class="result-row">
          <div class="result-label">Finding ${i + 1}</div>
          <div class="result-value">${f}</div>
        </div>`).join('')}
    </div>` : '';

  const timelineBlock = t.timeline && t.timeline.length > 0 ? `
    <div class="section-header">INVESTIGATION TIMELINE (${t.timeline.length} Events)</div>
    <div class="case-card">
      ${t.timeline.map(e => `
        <div class="result-row">
          <div class="result-label" style="font-size:9px;">${e.timestamp}</div>
          <div class="result-value">${e.event} <span style="font-size:10px;color:#9bb0c4;">· ${e.module}</span></div>
        </div>`).join('')}
    </div>` : '';

  const searchRows = caseData.searches.slice(0, 100).map(s => `
    <div class="result-row">
      <div class="result-label">${s.module}</div>
      <div class="result-value">${s.query} <span style="font-size:10px;color:#9bb0c4;">· ${s.timestamp}</span></div>
    </div>`).join('');

  const noteRows = caseData.notes.map(n => `
    <div class="note-card">
      <span class="note-tag">${n.tag}</span><span class="note-time">${n.timestamp}</span>
      <div class="note-text">${n.text}</div>
    </div>`).join('');

  const signatureBlock = `
    <div class="section-header">INVESTIGATOR CERTIFICATION</div>
    <div class="case-card">
      <div class="result-row"><div class="result-label">Investigator</div><div class="result-value">${t.investigator || '________________________'}</div></div>
      <div class="result-row"><div class="result-label">Firm</div><div class="result-value">${t.firmName || '________________________'}</div></div>
      <div class="result-row"><div class="result-label">License #</div><div class="result-value">${t.licenseNumber || '________________________'}</div></div>
      <div class="result-row"><div class="result-label">Date</div><div class="result-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
      <div class="result-row"><div class="result-label">Signature</div><div class="result-value" style="height:40px;border-bottom:1px solid #1a2535;width:200px;"></div></div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${CSS}</style></head><body>
    <div class="page">
      <div class="header">
        <div class="logo">SENTINEL</div>
        <div class="logo-sub">FIELD INTELLIGENCE PLATFORM · INVESTIGATION REPORT</div>
        <div class="report-title">${caseData.title}</div>
        <div class="meta-row">
          <div class="meta-item"><strong>Case ID:</strong> ${caseData.id}</div>
          <div class="meta-item"><strong>Status:</strong> <span class="badge ${statusClass}">${caseData.status.toUpperCase()}</span></div>
          <div class="meta-item"><strong>Priority:</strong> <span class="badge ${priorityClass}">${caseData.priority.toUpperCase()}</span></div>
          <div class="meta-item"><strong>Generated:</strong> ${new Date().toLocaleString('en-US')}</div>
        </div>
      </div>

      ${clientBlock}

      <div class="section-header">CASE OVERVIEW</div>
      <div class="case-card">
        ${caseData.subject     ? `<div class="result-row"><div class="result-label">Subject</div><div class="result-value">${caseData.subject}</div></div>` : ''}
        ${caseData.location    ? `<div class="result-row"><div class="result-label">Location</div><div class="result-value">${caseData.location}</div></div>` : ''}
        ${caseData.description ? `<div class="result-row"><div class="result-label">Description</div><div class="result-value">${caseData.description}</div></div>` : ''}
        ${caseData.tags.length ? `<div class="result-row"><div class="result-label">Tags</div><div class="result-value">${caseData.tags.join(' · ')}</div></div>` : ''}
      </div>

      ${aiBlock}
      ${findingsBlock}
      ${timelineBlock}

      <div class="section-header">RESEARCH LOG (${caseData.searches.length} Searches)</div>
      ${searchRows || '<div style="padding:12px 0;color:#9bb0c4;font-size:13px;">No searches recorded.</div>'}

      <div class="section-header">FIELD NOTES (${caseData.notes.length} Entries)</div>
      ${noteRows || '<div style="padding:12px 0;color:#9bb0c4;font-size:13px;">No notes recorded.</div>'}

      ${signatureBlock}

      <div class="disclaimer">⚖️ This report contains privileged investigative work product. Prepared by a professional investigator. Use in compliance with DPPA and applicable laws.</div>
      ${footer()}
    </div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Investigation Report – ${caseData.title}` });
}
