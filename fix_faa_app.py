#!/usr/bin/env python3
"""
Sentinel — Build 42: FAA Registry fix
Lisää FAA Registry suoraan searchVehicle-funktioon App.tsx:ssä
"""

import os

FILE = os.path.expanduser('~/Downloads/SentinelV4/App.tsx')

OLD_VEHICLE_END = """    results.push({ label: '─── ADDITIONAL SOURCES', value: '', type: 'info' });
    results.push({ label: 'NICB VINCheck', value: 'https://www.nicb.org/vincheck', type: 'link' });
    results.push({ label: 'NHTSA Complaints', value: `https://www.nhtsa.gov/vehicle/${q}`, type: 'link' });
    results.push({ label: 'Carfax', value: 'https://www.carfax.com/', type: 'link' });
    results.push({ label: 'DMV.org', value: 'https://www.dmv.org/', type: 'link' });
    
    return results;
  });"""

NEW_VEHICLE_END = """    results.push({ label: '─── ADDITIONAL SOURCES', value: '', type: 'info' });
    results.push({ label: 'NICB VINCheck', value: 'https://www.nicb.org/vincheck', type: 'link' });
    results.push({ label: 'NHTSA Complaints', value: `https://www.nhtsa.gov/vehicle/${q}`, type: 'link' });
    results.push({ label: 'Carfax', value: 'https://www.carfax.com/', type: 'link' });
    results.push({ label: 'VehicleHistory.com', value: `https://vehiclehistory.com/license-plate-search/${encodeURIComponent(q)}`, type: 'link' });
    results.push({ label: 'DMV.org', value: 'https://www.dmv.org/', type: 'link' });
    results.push({ label: 'OpenDMV', value: 'https://www.opendmv.com/', type: 'link' });

    results.push({ label: '─── FAA REGISTRY', value: '', type: 'info' });
    results.push({ label: 'FAA Aircraft Registry (N-Number)', value: 'https://registry.faa.gov/aircraftinquiry/Search/NNumberInquiry', type: 'link' });
    results.push({ label: 'FAA Aircraft by Owner Name', value: 'https://registry.faa.gov/aircraftinquiry/Search/NameInquiry', type: 'link' });
    results.push({ label: 'FAA Airmen Registry', value: 'https://amsrvs.registry.faa.gov/airmeninquiry/', type: 'link' });
    results.push({ label: 'FAA Accident & Incident Data', value: 'https://www.ntsb.gov/safety/data/Pages/Data_Stats.aspx', type: 'link' });
    results.push({ label: 'FlightAware Aircraft Search', value: `https://www.flightaware.com/live/flight/${q}`, type: 'link' });

    return results;
  });"""

def patch():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    if OLD_VEHICLE_END not in content:
        print("❌ searchVehicle-funktion loppua ei löydy — tarkista tiedosto")
        return False

    # Backup
    backup = FILE + '.backup_faa_app'
    with open(backup, 'w', encoding='utf-8') as f:
        f.write(content)

    content = content.replace(OLD_VEHICLE_END, NEW_VEHICLE_END)

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print("✅ FAA Registry lisätty searchVehicle-funktioon App.tsx:ssä!")
    print(f"📦 Backup: {backup}")
    return True

if __name__ == '__main__':
    patch()
