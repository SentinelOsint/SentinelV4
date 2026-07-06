#!/usr/bin/env python3
"""
Sentinel — Build 42: päivitetty appstore_metadata.txt
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/appstore_metadata.txt')

CONTENT = """APP STORE METADATA – SENTINEL OSINT TOOLKIT v2.8.0
==================================================

APP NAME: Sentinel – Mobile Investigation Platform

PROMOTIONAL TEXT:
The only professional field investigation platform for iPhone and iPad. AI-powered. Always with you.

KEYWORDS (100 chars max):
investigator,background check,people search,fbi,interpol,skip trace,sanctions,reverse phone,pi,osint

DESCRIPTION:
One case. One search. Sentinel pays for itself.

You're heading to a serve and need to verify the address fast. You're tracking a skip and need a wanted check before you approach. You're doing due diligence before a meeting and need sanctions screening now — not after you open your laptop.

Sentinel is a professional mobile investigation platform for iPhone and iPad. Built for private investigators, bail enforcement agents, process servers, corporate security professionals, and executive protection specialists.

THE INVESTIGATION PLATFORM THAT GOES WHERE YOU GO

12 investigation modules. FBI · Interpol · OFAC · UN Sanctions · 50 States · Canada. AI Risk Score. Court-ready PDF export. All in one encrypted app — in your pocket, in the field, before you ever open a laptop.

ONE INPUT. FULL INTELLIGENCE REPORT.

Type any identifier — name, phone, email, IP address, domain, or company. Sentinel detects the input automatically, searches 50+ sources simultaneously, and delivers a complete intelligence report instantly. No setup. No switching apps. No wasted time.

BUILT FOR THE FIELD

Person profiles, background intelligence, social media analysis
Phone carrier, line type & region identification
Email breach detection & domain intelligence
IP geolocation, ISP, ASN & threat analysis
Domain DNS, hosting & registration history
Company records, SEC EDGAR & corporate registry
Court records & public documents (PACER)
Vehicle & plate history, FAA aircraft registry
Geo intelligence, satellite imagery & flight tracking
FollowTheMoney political contributions & ProPublica nonprofit records
USPTO trademark & patent search
FamilySearch & historical records

ENCRYPTED. SECURE. YOURS ALONE.

AES-256 encryption. Face ID / Touch ID. Keys stored in iOS Secure Enclave — never in the cloud. Auto-lock, tamper-proof audit log, and one-tap data wipe. Your case files stay on your device, period.

COURT-READY DOCUMENTATION

Export any investigation as a professionally formatted PDF report with unique Report ID, timestamps, and source references. Built for legal documentation, case files, and client deliverables.

CHOOSE YOUR PLAN

SOLO — $29.99/month
The fast field tool for solo investigators and process servers.

All 12 investigation modules: One-Input Search, Person Search, Phone Lookup, Email Lookup, Social Media Search, IP & Network Intelligence, Domain & WHOIS, Company / Org Search, Vehicle & Plate Search, Court Records (PACER), Geo & Satellite Intelligence, and Image Analysis.

Also includes: Interactive Field Map, Investigation Timeline, Watch List monitoring, unlimited cases, court-ready PDF export, Field Notes, AES-256 encryption, Face ID / Touch ID, and shake-to-lock field security.

Solo does not include automatic wanted & sanctions checks or AI features.

PRO — $79.99/month
The full investigation platform. Everything in Solo, plus automatic wanted checks across 70+ databases and 7 AI-powered features — delivering deeper analysis and broader coverage than Solo.

AUTOMATIC WANTED & SANCTIONS CHECKS — 70+ SOURCES
(not available in Solo)
FBI Most Wanted & Ten Most Wanted · US Marshals, DEA, ICE, ATF, Secret Service, CBP · All 50 US state wanted lists · RCMP, CBSA, Canada's 25 Most Wanted (BOLO) · Provincial police: Ontario, Quebec, Alberta, BC, Manitoba, Saskatchewan · City police: Toronto, Montreal, Calgary, Edmonton, Winnipeg, Vancouver · Interpol Red Notices · OFAC SDN Sanctions · UN Security Council Sanctions · EU Consolidated Sanctions · BIS Denied Persons List

Every person search runs automatically against all 70+ sources. You don't have to ask. It just happens.

7 AI FEATURES — PRO EXCLUSIVE
(not available in Solo)
AI Risk Score (0–100) — automatic classification: LOW / MEDIUM / HIGH / CRITICAL
AI Deep Background Analysis — comprehensive subject profile
AI Contradiction Detection — cross-source inconsistencies identified automatically
AI Investigation Strategy — recommended next investigative steps
AI Case Report Generation — professional report ready to deliver
AI Field Notes Summary — key findings condensed from your notes
AI Image Intelligence — investigation-focused image analysis

Pro delivers deeper analysis and broader coverage than Solo — giving you the intelligence foundation to make sharper decisions in the field.

FOUNDING MEMBER OFFER — LIMITED TIME
The first 200 Pro subscribers lock in $79.99/month permanently. When Sentinel raises its price to $99.99/month, your rate never changes.

LEGAL NOTICE
Sentinel is not a Consumer Reporting Agency (CRA). This tool cannot be used for employment screening, credit decisions, insurance underwriting, or tenant screening under the FCRA. Users are responsible for compliance with DPPA and applicable federal and state laws.

Privacy Policy: https://sentinelosint.github.io/sentinel-privacy/
Support: sentinelosintapp@protonmail.com

==================================================
WHAT'S NEW — v2.8.0
==================================================

PRO — MAJOR UPDATE

New Investigation Sources:
- FollowTheMoney — political contributions & donor search
- ProPublica Nonprofit Explorer — IRS 990 filings & nonprofit records
- USPTO — trademark & patent search
- FamilySearch — historical records & genealogy
- FAA Aircraft & Airmen Registry — aircraft & pilot lookup

AI v3.0 Improvements:
- Enhanced risk profiling with detailed risk indicators across criminal, financial, reputational, and sanctions categories
- Improved contradiction detection with severity classification
- Deeper background analysis with actionable intelligence
- Investigation Timeline Pro — enhanced AI-powered session summary

SOLO — UPDATE

- Improved Investigation Timeline
- Performance improvements and bug fixes
"""

def save():
    backup = FILE + '.backup_v28'
    if os.path.exists(FILE):
        with open(FILE, 'r', encoding='utf-8') as f:
            old = f.read()
        with open(backup, 'w', encoding='utf-8') as f:
            f.write(old)
        print(f"📦 Backup: {backup}")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(CONTENT)

    print("✅ appstore_metadata.txt päivitetty!")

if __name__ == '__main__':
    save()
