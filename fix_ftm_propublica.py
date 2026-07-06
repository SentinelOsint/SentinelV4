#!/usr/bin/env python3
"""
Sentinel — Build 42: FollowTheMoney + ProPublica
Lisää molemmat Company-moduuliin omana osionaan
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/utils/osintEngines.ts')

OLD_COMPANY = """    { label: '─── STATE REGISTRATIONS', value: '', type: 'info' },
    { label: 'SOS (Multi-State Search)', value: `https://www.bizapedia.com/search.html?term=${company}`, type: 'link' },"""

NEW_COMPANY = """    { label: '─── POLITICAL & NONPROFIT RESEARCH', value: '', type: 'info' },
    { label: 'FollowTheMoney — Donor Search', value: `https://www.followthemoney.org/show-me?q=${company}&y=#tabs-6`, type: 'link' },
    { label: 'FollowTheMoney — Candidate Search', value: `https://www.followthemoney.org/show-me?q=${company}#tabs-1`, type: 'link' },
    { label: 'FollowTheMoney — Organization', value: `https://www.followthemoney.org/show-me?q=${company}&y=#tabs-3`, type: 'link' },
    { label: 'ProPublica Nonprofit Explorer', value: `https://projects.propublica.org/nonprofits/search?q=${company}`, type: 'link' },
    { label: 'ProPublica — IRS 990 Filings', value: `https://projects.propublica.org/nonprofits/search?q=${company}&state[id]=0&ntee[id]=0&c_code[id]=0`, type: 'link' },
    { label: 'OpenSecrets — Org Search', value: `https://www.opensecrets.org/search?q=${company}&type=orgs`, type: 'link' },
    { label: '─── STATE REGISTRATIONS', value: '', type: 'info' },
    { label: 'SOS (Multi-State Search)', value: `https://www.bizapedia.com/search.html?term=${company}`, type: 'link' },"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_COMPANY not in content:
        print("❌ Company-moduulin STATE REGISTRATIONS -kohtaa ei löydy")
        return False

    # Backup
    backup = FILE + '.backup_ftm_propublica'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_COMPANY, NEW_COMPANY)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ FollowTheMoney + ProPublica lisätty Company-moduuliin!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
