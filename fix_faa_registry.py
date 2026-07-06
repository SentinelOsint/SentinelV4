#!/usr/bin/env python3
"""
Sentinel — Build 42: FAA Registry
Lisää FAA Aircraft & Pilot Registry Vehicle-moduuliin
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/src/utils/osintEngines.ts')

OLD_VEHICLE_END = """    { label: '─── STATE DMV', value: '', type: 'info' },
    { label: 'DMV.org (State Links)', value: `https://www.dmv.org/`, type: 'link' },
    { label: 'OpenDMV', value: `https://www.opendmv.com/`, type: 'link' },
  ];
}"""

NEW_VEHICLE_END = """    { label: '─── STATE DMV', value: '', type: 'info' },
    { label: 'DMV.org (State Links)', value: `https://www.dmv.org/`, type: 'link' },
    { label: 'OpenDMV', value: `https://www.opendmv.com/`, type: 'link' },
    { label: '─── FAA REGISTRY', value: '', type: 'info' },
    { label: 'FAA Aircraft Registry', value: `https://registry.faa.gov/aircraftinquiry/Search/NNumberInquiry`, type: 'link' },
    { label: 'FAA Airmen Registry', value: `https://amsrvs.registry.faa.gov/airmeninquiry/`, type: 'link' },
    { label: 'FAA Aircraft by Owner', value: `https://registry.faa.gov/aircraftinquiry/Search/NameInquiry`, type: 'link' },
    { label: 'FAA Accident Database', value: `https://www.ntsb.gov/safety/data/Pages/Data_Stats.aspx`, type: 'link' },
    { label: 'FlightAware Owner Search', value: `https://www.flightaware.com/live/flight/${plate}`, type: 'link' },
  ];
}"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_VEHICLE_END not in content:
        print("❌ Vehicle-moduulin loppua ei löydy — tarkista tiedosto")
        return False

    # Backup
    backup = FILE + '.backup_faa'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_VEHICLE_END, NEW_VEHICLE_END)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ FAA Registry lisätty Vehicle-moduuliin!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
