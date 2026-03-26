/**
 * SENTINEL – OSINT Search Engines
 *
 * Each function returns an array of OsintResult items.
 * Results are curated links to public sources — no scraping,
 * no direct API calls (except IP lookup via ipapi.co which is free).
 *
 * Modules:
 *  1. IP & Network
 *  2. Domain & WHOIS
 *  3. Social Media (username)
 *  4. Person Search
 *  5. Phone Lookup
 *  6. Email Lookup
 *  7. Company / Org
 *  8. Vehicle
 *  9. Geo & Location
 * 10. Image Analysis
 * 11. Data Breaches
 * 12. Court Records
 */

import { OsintResult } from '../types';

// ── 1. IP & Network ──────────────────────────────────────────────────────────
export function getIPResults(d: any): OsintResult[] {
  return [
    { label: 'IP ADDRESS', value: d.ip || 'Unknown', type: 'copy' },
    { label: 'LOCATION', value: `${d.city || ''}, ${d.region || ''}, ${d.country_name || ''}`.replace(/^, |, $/g, ''), type: 'data' },
    { label: 'COORDINATES', value: d.latitude && d.longitude ? `${d.latitude}, ${d.longitude}` : 'N/A', type: 'copy' },
    { label: 'ISP / ORG', value: d.org || d.asn || 'Unknown', type: 'data' },
    { label: 'ASN', value: d.asn || 'Unknown', type: 'data' },
    { label: 'TIMEZONE', value: d.timezone || 'Unknown', type: 'data' },
    { label: 'POSTAL CODE', value: d.postal || 'Unknown', type: 'data' },
    { label: 'VPN / PROXY', value: d.threat?.is_proxy ? '⚠️ Proxy detected' : d.threat?.is_vpn ? '⚠️ VPN detected' : 'Not detected', type: 'data' },
    { label: '─── THREAT INTELLIGENCE', value: '', type: 'info' },
    { label: 'AbuseIPDB', value: `https://www.abuseipdb.com/check/${d.ip}`, type: 'link' },
    { label: 'VirusTotal', value: `https://www.virustotal.com/gui/ip-address/${d.ip}`, type: 'link' },
    { label: 'Shodan', value: `https://www.shodan.io/host/${d.ip}`, type: 'link' },
    { label: 'Censys', value: `https://search.censys.io/hosts/${d.ip}`, type: 'link' },
    { label: 'IPinfo', value: `https://ipinfo.io/${d.ip}`, type: 'link' },
    { label: 'Grey Noise', value: `https://viz.greynoise.io/ip/${d.ip}`, type: 'link' },
    { label: '─── GEOLOCATION', value: '', type: 'info' },
    { label: 'Google Maps', value: d.latitude && d.longitude ? `https://maps.google.com/?q=${d.latitude},${d.longitude}` : 'https://maps.google.com', type: 'link' },
  ];
}

// ── 2. Domain & WHOIS ────────────────────────────────────────────────────────
export function getDomainResults(domain: string, ipData: any): OsintResult[] {
  return [
    { label: 'DOMAIN', value: domain, type: 'copy' },
    { label: 'RESOLVED IP', value: ipData.ip || 'Could not resolve', type: 'data' },
    { label: 'HOSTING ORG', value: ipData.org || 'Unknown', type: 'data' },
    { label: 'HOSTING LOCATION', value: ipData.country_name || 'Unknown', type: 'data' },
    { label: '─── WHOIS & REGISTRATION', value: '', type: 'info' },
    { label: 'WHOIS Lookup', value: `https://www.whois.com/whois/${domain}`, type: 'link' },
    { label: 'DomainTools WHOIS', value: `https://whois.domaintools.com/${domain}`, type: 'link' },
    { label: 'ICANN WHOIS', value: `https://lookup.icann.org/en/lookup?name=${domain}`, type: 'link' },
    { label: '─── DNS & INFRASTRUCTURE', value: '', type: 'info' },
    { label: 'MXToolbox DNS', value: `https://mxtoolbox.com/SuperTool.aspx?action=dns%3a${domain}&run=toolpage`, type: 'link' },
    { label: 'DNSdumpster', value: `https://dnsdumpster.com/`, type: 'link' },
    { label: 'SecurityTrails', value: `https://securitytrails.com/domain/${domain}/dns`, type: 'link' },
    { label: '─── REPUTATION & HISTORY', value: '', type: 'info' },
    { label: 'Wayback Machine', value: `https://web.archive.org/web/*/${domain}`, type: 'link' },
    { label: 'VirusTotal', value: `https://www.virustotal.com/gui/domain/${domain}`, type: 'link' },
    { label: 'URLScan', value: `https://urlscan.io/search/#domain:${domain}`, type: 'link' },
    { label: 'Shodan', value: `https://www.shodan.io/search?query=${domain}`, type: 'link' },
    { label: 'Certificate Search', value: `https://crt.sh/?q=${domain}`, type: 'link' },
    { label: 'Built With', value: `https://builtwith.com/${domain}`, type: 'link' },
  ];
}

// ── 3. Social Media (username) ────────────────────────────────────────────────
export function getSocialResults(username: string): OsintResult[] {
  const u = username;
  return [
    { label: '─── MAJOR PLATFORMS', value: '', type: 'info' },
    { label: 'Instagram', value: `https://www.instagram.com/${u}/`, type: 'link' },
    { label: 'Twitter / X', value: `https://x.com/${u}`, type: 'link' },
    { label: 'Facebook', value: `https://www.facebook.com/${u}`, type: 'link' },
    { label: 'LinkedIn', value: `https://www.linkedin.com/in/${u}`, type: 'link' },
    { label: 'TikTok', value: `https://www.tiktok.com/@${u}`, type: 'link' },
    { label: 'YouTube', value: `https://www.youtube.com/@${u}`, type: 'link' },
    { label: 'Pinterest', value: `https://www.pinterest.com/${u}/`, type: 'link' },
    { label: 'Snapchat', value: `https://www.snapchat.com/add/${u}`, type: 'link' },
    { label: 'Threads', value: `https://www.threads.net/@${u}`, type: 'link' },
    { label: '─── TECH & DEVELOPER', value: '', type: 'info' },
    { label: 'GitHub', value: `https://github.com/${u}`, type: 'link' },
    { label: 'GitLab', value: `https://gitlab.com/${u}`, type: 'link' },
    { label: 'Reddit', value: `https://www.reddit.com/user/${u}`, type: 'link' },
    { label: 'Hacker News', value: `https://news.ycombinator.com/user?id=${u}`, type: 'link' },
    { label: 'Stack Overflow', value: `https://stackoverflow.com/users/${u}`, type: 'link' },
    { label: '─── OTHER PLATFORMS', value: '', type: 'info' },
    { label: 'Twitch', value: `https://www.twitch.tv/${u}`, type: 'link' },
    { label: 'Discord (Lookup)', value: `https://discord.id/`, type: 'link' },
    { label: 'Telegram', value: `https://t.me/${u}`, type: 'link' },
    { label: 'Medium', value: `https://medium.com/@${u}`, type: 'link' },
    { label: 'Substack', value: `https://${u}.substack.com`, type: 'link' },
    { label: 'Linktree', value: `https://linktr.ee/${u}`, type: 'link' },
    { label: 'Venmo', value: `https://venmo.com/${u}`, type: 'link' },
    { label: 'Cash App', value: `https://cash.app/$${u}`, type: 'link' },
    { label: '─── OSINT AGGREGATORS', value: '', type: 'info' },
    { label: 'Sherlock (Web)', value: `https://sherlock-project.github.io/`, type: 'link' },
    { label: 'WhatsMyName', value: `https://whatsmyname.app/`, type: 'link' },
    { label: 'Namechk', value: `https://namechk.com/`, type: 'link' },
  ];
}

// ── 4. Person Search ──────────────────────────────────────────────────────────
export async function getPersonResults(name: string, location: string, isPro: boolean = false): Promise<OsintResult[]> {
  // FBI Most Wanted API check
  const wantedResults: OsintResult[] = [];
  try {
    const decodedName = decodeURIComponent(name).trim();
    const fbiUrl = `https://api.fbi.gov/wanted/v1/list?title=${encodeURIComponent(decodedName)}`;
    const fbiRes = await fetch(fbiUrl);
    const fbiData = await fbiRes.json();
    const searchName = decodedName.toLowerCase().trim();
    const fbiMatch = fbiData.items?.filter((item: any) => {
      const title = (item.title || '').toLowerCase().trim();
      return title === searchName;
    });
    if (fbiMatch && fbiMatch.length > 0) {
      wantedResults.push({ label: '🚨 FBI MOST WANTED MATCH', value: `ALERT: ${decodedName} found on FBI Most Wanted list!`, type: 'copy' as const });
      fbiMatch.slice(0, 3).forEach((item: any) => {
        wantedResults.push({ label: item.title || 'Unknown', value: item.url || 'https://www.fbi.gov/wanted', type: 'link' as const });
      });
    } else {
      wantedResults.push({ label: '✅ FBI Most Wanted', value: 'No match found in FBI Most Wanted database', type: 'info' as const });
    }
  } catch {
    wantedResults.push({ label: 'FBI Most Wanted', value: 'https://www.fbi.gov/wanted', type: 'link' as const });
  }

  // Interpol Red Notices API check
  try {
    const nameParts = decodeURIComponent(name).trim().split(' ');
    const forename = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
    const surname = nameParts[nameParts.length - 1] || '';
    const interpolUrl = `https://sentinel-backend-production-05e1.up.railway.app/interpol/search?forename=${encodeURIComponent(forename)}&name=${encodeURIComponent(surname)}`;
    const interpolRes = await fetch(interpolUrl);
    const interpolData = await interpolRes.json();
    const notices = interpolData?._embedded?.notices || [];
    if (notices.length > 0) {
      wantedResults.push({ label: '🚨 INTERPOL RED NOTICE MATCH', value: `ALERT: Possible Interpol Red Notice match found!`, type: 'copy' as const });
      notices.slice(0, 3).forEach((n: any) => {
        const fullName = `${n.forename || ''} ${n.name || ''}`.trim();
        const url = n._links?.self?.href ? `https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices` : 'https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices';
        wantedResults.push({ label: `Interpol: ${fullName}`, value: url, type: 'link' as const });
      });
    } else {
      wantedResults.push({ label: '✅ Interpol Red Notices', value: 'No match found in Interpol Red Notices database', type: 'info' as const });
    }
  } catch {
    wantedResults.push({ label: 'Interpol Red Notices', value: 'https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices', type: 'link' as const });
  }
  const q = `${name}${location}`;
  return [
    ...(isPro ? wantedResults : []),
    ...((isPro ? [
    { label: '─── FEDERAL WANTED LISTS (USA)', value: '', type: 'info' },
    { label: 'FBI Most Wanted', value: `https://www.fbi.gov/wanted`, type: 'link' },
    { label: 'FBI Ten Most Wanted', value: `https://www.fbi.gov/wanted/topten`, type: 'link' },
    { label: 'US Marshals 15 Most Wanted', value: `https://www.usmarshals.gov/what-we-do/fugitive-operations/15-most-wanted`, type: 'link' },
    { label: 'US Marshals Wanted', value: `https://www.usmarshals.gov/what-we-do/fugitive-operations/wanted-fugitives`, type: 'link' },
    { label: 'DEA Most Wanted', value: `https://www.dea.gov/fugitives/all`, type: 'link' },
    { label: 'ICE Most Wanted', value: `https://www.ice.gov/most-wanted`, type: 'link' },
    { label: 'ATF Most Wanted', value: `https://www.atf.gov/most-wanted`, type: 'link' },
    { label: 'Secret Service Most Wanted', value: `https://www.secretservice.gov/investigation/most-wanted`, type: 'link' },
    { label: 'CBP Most Wanted', value: `https://www.cbp.gov/border-security/human-trafficking/most-wanted`, type: 'link' },
    { label: '─── US STATE WANTED LISTS', value: '', type: 'info' },
    { label: 'Alabama – Most Wanted', value: `https://www.alabama.gov/mostwanted`, type: 'link' },
    { label: 'Alaska – Most Wanted', value: `https://dps.alaska.gov/AboutDPS/MostWanted`, type: 'link' },
    { label: 'Arizona – Most Wanted', value: `https://www.azdps.gov/safety/most_wanted`, type: 'link' },
    { label: 'Arkansas – Most Wanted', value: `https://www.dfa.arkansas.gov/fugitives`, type: 'link' },
    { label: 'California – Most Wanted', value: `https://www.caldoj.org/wanted`, type: 'link' },
    { label: 'Colorado – Most Wanted', value: `https://cbi.colorado.gov/sections/fugitive-unit/most-wanted`, type: 'link' },
    { label: 'Connecticut – Most Wanted', value: `https://portal.ct.gov/DESPP/Division-of-State-Police/Fugitive-Task-Force/Most-Wanted`, type: 'link' },
    { label: 'Delaware – Most Wanted', value: `https://dsp.delaware.gov/fugitive-unit/`, type: 'link' },
    { label: 'Florida – Most Wanted', value: `https://www.fdle.state.fl.us/wanted`, type: 'link' },
    { label: 'Georgia – Most Wanted', value: `https://gbi.georgia.gov/services/most-wanted`, type: 'link' },
    { label: 'Hawaii – Most Wanted', value: `https://www.hawaiipolice.com/most-wanted`, type: 'link' },
    { label: 'Idaho – Most Wanted', value: `https://isp.idaho.gov/BCI/mostWanted.html`, type: 'link' },
    { label: 'Illinois – Most Wanted', value: `https://isp.illinois.gov/MostWanted`, type: 'link' },
    { label: 'Indiana – Most Wanted', value: `https://www.in.gov/isp/fugitive/`, type: 'link' },
    { label: 'Iowa – Most Wanted', value: `https://www.dps.state.ia.us/CriminalInvestigation/MostWanted/`, type: 'link' },
    { label: 'Kansas – Most Wanted', value: `https://www.kbi.ks.gov/fugitives`, type: 'link' },
    { label: 'Kentucky – Most Wanted', value: `https://kentuckystatepolice.org/most-wanted/`, type: 'link' },
    { label: 'Louisiana – Most Wanted', value: `https://lsp.org/mostwanted.html`, type: 'link' },
    { label: 'Maine – Most Wanted', value: `https://www.maine.gov/dps/msp/investigation-traffic/fugitives`, type: 'link' },
    { label: 'Maryland – Most Wanted', value: `https://mdsp.maryland.gov/Organization/Pages/CriminalInvestigationBureau/MostWanted.aspx`, type: 'link' },
    { label: 'Massachusetts – Most Wanted', value: `https://www.mass.gov/most-wanted`, type: 'link' },
    { label: 'Michigan – Most Wanted', value: `https://www.michigan.gov/msp/divisions/cid/most-wanted`, type: 'link' },
    { label: 'Minnesota – Most Wanted', value: `https://dps.mn.gov/divisions/bca/bca-divisions/investigations/Pages/fugitive-apprehension-unit.aspx`, type: 'link' },
    { label: 'Mississippi – Most Wanted', value: `https://www.dps.state.ms.us/mbi/most-wanted/`, type: 'link' },
    { label: 'Missouri – Most Wanted', value: `https://www.mshp.dps.missouri.gov/MSHPWeb/PatrolDivisions/CID/fugitives.html`, type: 'link' },
    { label: 'Montana – Most Wanted', value: `https://doj.mt.gov/enforcement/most-wanted/`, type: 'link' },
    { label: 'Nebraska – Most Wanted', value: `https://nsp.nebraska.gov/most-wanted`, type: 'link' },
    { label: 'Nevada – Most Wanted', value: `https://www.nvdps.gov/most-wanted`, type: 'link' },
    { label: 'New Hampshire – Most Wanted', value: `https://www.nh.gov/safety/divisions/nhsp/bureaus/criminalinvestigations/fugitives/`, type: 'link' },
    { label: 'New Jersey – Most Wanted', value: `https://www.njsp.org/division/investigations/most-wanted.shtml`, type: 'link' },
    { label: 'New Mexico – Most Wanted', value: `https://www.dps.nm.gov/fugitives`, type: 'link' },
    { label: 'New York – Most Wanted', value: `https://troopers.ny.gov/most-wanted`, type: 'link' },
    { label: 'North Carolina – Most Wanted', value: `https://www.ncsbi.gov/Services/Most-Wanted`, type: 'link' },
    { label: 'North Dakota – Most Wanted', value: `https://www.hpcnd.org/most-wanted`, type: 'link' },
    { label: 'Ohio – Most Wanted', value: `https://www.ohioattorneygeneral.gov/Law-Enforcement/Ohio-Fugitive-Safe-Surrender/Most-Wanted`, type: 'link' },
    { label: 'Oklahoma – Most Wanted', value: `https://osbi.ok.gov/most-wanted`, type: 'link' },
    { label: 'Oregon – Most Wanted', value: `https://www.oregon.gov/osp/programs/ID/Pages/mostWanted.aspx`, type: 'link' },
    { label: 'Pennsylvania – Most Wanted', value: `https://www.psp.pa.gov/fugitives/Pages/default.aspx`, type: 'link' },
    { label: 'Rhode Island – Most Wanted', value: `https://riag.ri.gov/civil-and-criminal-actions/most-wanted`, type: 'link' },
    { label: 'South Carolina – Most Wanted', value: `https://www.sled.sc.gov/mostwanted.aspx`, type: 'link' },
    { label: 'South Dakota – Most Wanted', value: `https://dci.sd.gov/Investigations/MostWanted.aspx`, type: 'link' },
    { label: 'Tennessee – Most Wanted', value: `https://www.tn.gov/tbi/crime-info/most-wanted.html`, type: 'link' },
    { label: 'Texas – Most Wanted', value: `https://www.dps.texas.gov/section/texas-10-most-wanted`, type: 'link' },
    { label: 'Utah – Most Wanted', value: `https://bci.utah.gov/most-wanted/`, type: 'link' },
    { label: 'Vermont – Most Wanted', value: `https://vsp.vermont.gov/investigations/fugitives`, type: 'link' },
    { label: 'Virginia – Most Wanted', value: `https://www.vsp.virginia.gov/CJIS_MostWanted.shtm`, type: 'link' },
    { label: 'Washington – Most Wanted', value: `https://www.wsp.wa.gov/crime/most-wanted/`, type: 'link' },
    { label: 'West Virginia – Most Wanted', value: `https://www.wvsp.gov/about/Pages/MostWanted.aspx`, type: 'link' },
    { label: 'Wisconsin – Most Wanted', value: `https://www.doj.state.wi.us/dles/cib/most-wanted`, type: 'link' },
    { label: 'Wyoming – Most Wanted', value: `https://wci.wyo.gov/adult-corrections/most-wanted`, type: 'link' },
    { label: '─── CANADA – FEDERAL WANTED LISTS', value: '', type: 'info' },
    { label: 'RCMP Most Wanted', value: `https://www.rcmp-grc.gc.ca/en/most-wanted`, type: 'link' },
    { label: "Canada's 25 Most Wanted", value: `https://www.canada25mostwanted.com/`, type: 'link' },
    { label: 'CBSA Most Wanted', value: `https://www.cbsa-asfc.gc.ca/security-securite/war-rec/menu-eng.html`, type: 'link' },
    { label: 'BOLO Program', value: `https://www.boloprogram.org/`, type: 'link' },
    { label: '─── CANADA – PROVINCIAL & MUNICIPAL', value: '', type: 'info' },
    { label: 'Toronto Police Most Wanted', value: `https://www.tps.ca/crime/most-wanted/`, type: 'link' },
    { label: 'OPP Most Wanted (Ontario)', value: `https://www.opp.ca/index.php?id=115&entryid=most-wanted`, type: 'link' },
    { label: 'Sûreté du Québec', value: `https://www.sq.gouv.qc.ca/activites-missions/criminalite/personnes-recherchees/`, type: 'link' },
    { label: 'SPVM Most Wanted (Montréal)', value: `https://spvm.qc.ca/en/Fiches/Details/Personnes-recherchees`, type: 'link' },
    { label: 'Calgary Police Most Wanted', value: `https://www.calgarypolice.ca/most-wanted`, type: 'link' },
    { label: 'Edmonton Police Most Wanted', value: `https://www.edmontonpolice.ca/CommunityPolicing/MostWanted`, type: 'link' },
    { label: 'Winnipeg Police Most Wanted', value: `https://www.winnipeg.ca/police/most-wanted/`, type: 'link' },
    { label: 'Vancouver Police Most Wanted', value: `https://vpd.ca/crime-statistics-updates/most-wanted/`, type: 'link' },
    { label: 'RCMP BC Most Wanted', value: `https://bc.rcmp-grc.gc.ca/ViewPage.action?siteNodeId=87&languageId=1&contentId=-1`, type: 'link' },
    { label: 'RCMP Alberta Most Wanted', value: `https://www.rcmp-grc.gc.ca/en/alberta/most-wanted`, type: 'link' },
    { label: 'RCMP Saskatchewan Most Wanted', value: `https://www.rcmp-grc.gc.ca/en/saskatchewan/most-wanted`, type: 'link' },
    { label: 'RCMP Manitoba Most Wanted', value: `https://www.rcmp-grc.gc.ca/en/manitoba/most-wanted`, type: 'link' },
    ] : []) as OsintResult[]),
    { label: '─── PUBLIC RECORDS', value: '', type: 'info' },
    { label: 'TruthFinder', value: `https://www.truthfinder.com/results/?firstName=${name}&lastName=`, type: 'link' },
    { label: 'Spokeo', value: `https://www.spokeo.com/${name.replace(/%20/g,'-')}`, type: 'link' },
    { label: 'Whitepages', value: `https://www.whitepages.com/name/${name.replace(/%20/g,'-')}`, type: 'link' },
    { label: 'FastPeopleSearch', value: `https://www.fastpeoplesearch.com/name/${name.replace(/%20/g,'-')}`, type: 'link' },
    { label: 'PeopleFinder', value: `https://www.peoplefinder.com/search/?full_name=${name}`, type: 'link' },
    { label: 'Intelius', value: `https://www.intelius.com/people-search/`, type: 'link' },
    { label: '─── PROFESSIONAL RECORDS', value: '', type: 'info' },
    { label: 'LinkedIn Search', value: `https://www.linkedin.com/search/results/people/?keywords=${q}`, type: 'link' },
    { label: 'ZoomInfo', value: `https://www.zoominfo.com/s/#!search/people/${name}`, type: 'link' },
    { label: 'Pipl', value: `https://pipl.com/search/?q=${name}&in=5`, type: 'link' },
    { label: '─── PROFESSIONAL LICENSES', value: '', type: 'info' },
    { label: 'License Lookup (NIPR)', value: `https://nipr.com/`, type: 'link' },
    { label: 'Healthcare Licenses', value: `https://www.npdb.hrsa.gov/`, type: 'link' },
    { label: 'State License Search', value: `https://www.usa.gov/state-professional-licenses`, type: 'link' },
    { label: '─── COURT & LEGAL', value: '', type: 'info' },
    { label: 'PACER (Federal)', value: `https://pacer.uscourts.gov/`, type: 'link' },
    { label: 'CourtListener', value: `https://www.courtlistener.com/?q=${name}&type=r`, type: 'link' },
    { label: '─── SOCIAL & WEB', value: '', type: 'info' },
    { label: 'Google Search', value: `https://www.google.com/search?q=${q}`, type: 'link' },
    { label: 'Google Images', value: `https://www.google.com/search?q=${q}&tbm=isch`, type: 'link' },
    { label: 'Twitter / X Search', value: `https://x.com/search?q=${name}&f=user`, type: 'link' },
    { label: 'YouTube Channel Search', value: `https://www.youtube.com/results?search_query=${q}&sp=EgIQAg%253D%253D`, type: 'link' },
    { label: 'YouTube Video Search', value: `https://www.youtube.com/results?search_query=${q}`, type: 'link' },
  ];
}

// ── 5. Phone Lookup ───────────────────────────────────────────────────────────
export function getPhoneResults(phone: string): OsintResult[] {
  return [
    { label: 'PHONE', value: phone, type: 'copy' },
    { label: '─── CARRIER & OWNER', value: '', type: 'info' },
    { label: 'Truecaller', value: `https://www.truecaller.com/search/us/${phone}`, type: 'link' },
    { label: 'Whitepages Reverse', value: `https://www.whitepages.com/phone/${phone}`, type: 'link' },
    { label: 'Spokeo Phone', value: `https://www.spokeo.com/phone/${phone}`, type: 'link' },
    { label: 'AnyWho', value: `https://www.anywho.com/reverse-lookup/${phone}`, type: 'link' },
    { label: 'Zlookup', value: `https://www.zlookup.com/`, type: 'link' },
    { label: '─── SPAM & FRAUD', value: '', type: 'info' },
    { label: 'Should I Answer?', value: `https://www.shouldianswer.com/phone-number/${phone}`, type: 'link' },
    { label: 'WhoCallsMe', value: `https://www.whocalledme.com/PhoneNumber/${phone}`, type: 'link' },
    { label: 'CallerSmart', value: `https://www.callersmart.com/lookup/phone-number/${phone}`, type: 'link' },
    { label: '─── CARRIER LOOKUP', value: '', type: 'info' },
    { label: 'FCC Number Portability', value: `https://www.localcallingguide.com/lca_prefix.php?pre=${phone.slice(1,8)}`, type: 'link' },
    { label: 'Twilio Lookup', value: `https://lookup.twilio.com/`, type: 'link' },
    { label: '─── SOCIAL SEARCH', value: '', type: 'info' },
    { label: 'Facebook Search', value: `https://www.facebook.com/search/top/?q=${phone}`, type: 'link' },
    { label: 'Telegram Search', value: `https://t.me/+${phone}`, type: 'link' },
    { label: 'Google Search', value: `https://www.google.com/search?q="${phone}"`, type: 'link' },
  ];
}

// ── 6. Email Lookup ───────────────────────────────────────────────────────────
export function getEmailResults(email: string, domain: string): OsintResult[] {
  return [
    { label: 'EMAIL', value: email, type: 'copy' },
    { label: 'DOMAIN', value: domain, type: 'data' },
    { label: '─── BREACH DATABASES', value: '', type: 'info' },
    { label: 'HaveIBeenPwned', value: `https://haveibeenpwned.com/account/${email}`, type: 'link' },
    { label: 'DeHashed', value: `https://dehashed.com/search?query=${email}`, type: 'link' },
    { label: 'LeakCheck', value: `https://leakcheck.io/?query=${email}`, type: 'link' },
    { label: '─── EMAIL VERIFICATION', value: '', type: 'info' },
    { label: 'Hunter.io', value: `https://hunter.io/email-verifier/${email}`, type: 'link' },
    { label: 'EmailRep', value: `https://emailrep.io/${email}`, type: 'link' },
    { label: 'MXToolbox (Domain)', value: `https://mxtoolbox.com/emailhealth/${domain}`, type: 'link' },
    { label: '─── SOCIAL PRESENCE', value: '', type: 'info' },
    { label: 'Gravatar', value: `https://en.gravatar.com/${email}`, type: 'link' },
    { label: 'Google Search', value: `https://www.google.com/search?q="${email}"`, type: 'link' },
    { label: 'Twitter / X', value: `https://x.com/search?q=${email}`, type: 'link' },
    { label: 'Facebook', value: `https://www.facebook.com/search/top/?q=${email}`, type: 'link' },
    { label: '─── DOMAIN INTEL', value: '', type: 'info' },
    { label: 'WHOIS Domain', value: `https://www.whois.com/whois/${domain}`, type: 'link' },
    { label: 'VirusTotal Domain', value: `https://www.virustotal.com/gui/domain/${domain}`, type: 'link' },
  ];
}

// ── 7. Company / Org ──────────────────────────────────────────────────────────
export function getCompanyResults(company: string): OsintResult[] {
  return [
    { label: '─── SEC & FINANCIAL', value: '', type: 'info' },
    { label: 'SEC EDGAR', value: `https://efts.sec.gov/LATEST/search-index?q=${company}&dateRange=custom&startdt=2000-01-01&enddt=2099-01-01&forms=10-K`, type: 'link' },
    { label: 'SEC Full-Text Search', value: `https://efts.sec.gov/LATEST/search-index?q=${company}`, type: 'link' },
    { label: 'OpenCorporates', value: `https://opencorporates.com/companies?q=${company}&utf8=✓`, type: 'link' },
    { label: '─── STATE REGISTRATIONS', value: '', type: 'info' },
    { label: 'SOS (Multi-State Search)', value: `https://www.bizapedia.com/search.html?term=${company}`, type: 'link' },
    { label: 'NAICS/SIC Lookup', value: `https://www.naics.com/search/`, type: 'link' },
    { label: '─── PEOPLE & OFFICERS', value: '', type: 'info' },
    { label: 'LinkedIn Company', value: `https://www.linkedin.com/search/results/companies/?keywords=${company}`, type: 'link' },
    { label: 'ZoomInfo', value: `https://www.zoominfo.com/s/#!search/company/${company}`, type: 'link' },
    { label: 'OpenCorporates', value: `https://opencorporates.com/companies?q=${company}`, type: 'link' },
    { label: '─── NEWS & REPUTATION', value: '', type: 'info' },
    { label: 'Google News', value: `https://news.google.com/search?q=${company}`, type: 'link' },
    { label: 'BBB', value: `https://www.bbb.org/search?find_text=${company}`, type: 'link' },
    { label: 'Ripoff Report', value: `https://www.ripoffreport.com/results/${company}`, type: 'link' },
    { label: 'Glassdoor', value: `https://www.glassdoor.com/Reviews/company-reviews.htm?sc.keyword=${company}`, type: 'link' },
    { label: '─── BENEFICIAL OWNERSHIP', value: '', type: 'info' },
    { label: 'FinCEN BOI', value: `https://boiefiling.fincen.gov/`, type: 'link' },
    { label: 'OFAC Sanctions', value: `https://sanctionssearch.ofac.treas.gov/`, type: 'link' },
    { label: 'World-Check (Refinitiv)', value: `https://risk.thomsonreuters.com/en/products/world-check-know-your-customer.html`, type: 'link' },
  ];
}

// ── 8. Vehicle ─────────────────────────────────────────────────────────────────
export function getVehicleResults(plate: string, plateEncoded: string): OsintResult[] {
  return [
    { label: 'PLATE / VIN', value: plate, type: 'copy' },
    { label: '─── TITLE & REGISTRATION', value: '', type: 'info' },
    { label: 'NICB VINCheck', value: `https://www.nicb.org/vincheck`, type: 'link' },
    { label: 'NHTSA VIN Decoder', value: `https://vpic.nhtsa.dot.gov/decoder/Decoder`, type: 'link' },
    { label: 'VehicleHistory.com', value: `https://vehiclehistory.com/license-plate-search/${plateEncoded}`, type: 'link' },
    { label: 'VinCheck.info', value: `https://www.vincheck.info/`, type: 'link' },
    { label: '─── AUCTION & VALUE', value: '', type: 'info' },
    { label: 'Copart', value: `https://www.copart.com/vehicleFinderSearch/?query=${plateEncoded}`, type: 'link' },
    { label: 'IAAI Auctions', value: `https://www.iaai.com/search#${plateEncoded}`, type: 'link' },
    { label: 'KBB Value', value: `https://www.kbb.com/`, type: 'link' },
    { label: 'Carfax', value: `https://www.carfax.com/`, type: 'link' },
    { label: '─── RECALL & SAFETY', value: '', type: 'info' },
    { label: 'NHTSA Recalls', value: `https://www.nhtsa.gov/recalls`, type: 'link' },
    { label: '─── STATE DMV', value: '', type: 'info' },
    { label: 'DMV.org (State Links)', value: `https://www.dmv.org/`, type: 'link' },
    { label: 'OpenDMV', value: `https://www.opendmv.com/`, type: 'link' },
  ];
}

// ── 9. Geo & Location ─────────────────────────────────────────────────────────
export function getGeoResults(query: string, rawQuery: string): OsintResult[] {
  const coordMatch = rawQuery.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  const lat = coordMatch ? coordMatch[1] : '';
  const lng = coordMatch ? coordMatch[2] : '';
  return [
    { label: '─── SATELLITE & MAPS', value: '', type: 'info' },
    { label: 'Google Maps', value: lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : `https://maps.google.com/?q=${query}`, type: 'link' },
    { label: 'Google Earth', value: lat && lng ? `https://earth.google.com/web/@${lat},${lng},500a,500d,35y` : `https://earth.google.com/web/search/${query}`, type: 'link' },
    { label: 'Bing Maps Bird\'s Eye', value: lat && lng ? `https://www.bing.com/maps?cp=${lat}~${lng}&sty=b&lvl=19` : `https://www.bing.com/maps?q=${query}`, type: 'link' },
    { label: 'OpenStreetMap', value: lat && lng ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}` : `https://www.openstreetmap.org/search?query=${query}`, type: 'link' },
    { label: 'What3Words', value: `https://what3words.com/${query}`, type: 'link' },
    { label: '─── FLIGHT & VESSEL', value: '', type: 'info' },
    { label: 'FlightAware', value: `https://flightaware.com/live/`, type: 'link' },
    { label: 'Flightradar24', value: `https://www.flightradar24.com/${lat && lng ? `${lat},${lng}` : ''}`, type: 'link' },
    { label: 'MarineTraffic', value: lat && lng ? `https://www.marinetraffic.com/en/ais/home/centerx:${lng}/centery:${lat}/zoom:12` : `https://www.marinetraffic.com/`, type: 'link' },
    { label: 'VesselFinder', value: `https://www.vesselfinder.com/`, type: 'link' },
    { label: '─── GEOSPATIAL INTEL', value: '', type: 'info' },
    { label: 'Sentinel Hub EO Browser', value: `https://apps.sentinel-hub.com/eo-browser/`, type: 'link' },
    { label: 'Zoom Earth (Live)', value: lat && lng ? `https://zoom.earth/#view=${lat},${lng},17z` : `https://zoom.earth/`, type: 'link' },
    { label: 'Bing StreetSide', value: lat && lng ? `https://www.bing.com/maps?cp=${lat}~${lng}&sty=x&lvl=19` : `https://www.bing.com/maps?q=${query}`, type: 'link' },
    { label: 'USGS Earth Explorer', value: `https://earthexplorer.usgs.gov/`, type: 'link' },
  ];
}

// ── 10. Image Analysis ────────────────────────────────────────────────────────
export function getImageResults(query: string, rawQuery: string): OsintResult[] {
  const isURL = rawQuery.startsWith('http');
  const encoded = encodeURIComponent(rawQuery);
  return [
    { label: '─── REVERSE IMAGE SEARCH', value: '', type: 'info' },
    { label: 'Google Images', value: isURL ? `https://lens.google.com/uploadbyurl?url=${encoded}` : `https://images.google.com/`, type: 'link' },
    { label: 'TinEye', value: isURL ? `https://tineye.com/search?url=${encoded}` : `https://tineye.com/`, type: 'link' },
    { label: 'Yandex Images', value: isURL ? `https://yandex.com/images/search?source=collections&rpt=imageview&url=${encoded}` : `https://yandex.com/images/`, type: 'link' },
    { label: 'Bing Visual Search', value: isURL ? `https://www.bing.com/images/searchbyimage?FORM=IRSBIQ&cbir=sbi&imgurl=${encoded}` : `https://www.bing.com/visualsearch`, type: 'link' },
    { label: 'PimEyes (Face Search)', value: `https://pimeyes.com/en`, type: 'link' },
    { label: 'FaceCheck.ID', value: `https://facecheck.id/`, type: 'link' },
    { label: '─── METADATA & EXIF', value: '', type: 'info' },
    { label: 'Jeffrey\'s EXIF Viewer', value: isURL ? `http://exif.regex.info/exif.cgi?url=${encoded}` : `http://exif.regex.info/exif.cgi`, type: 'link' },
    { label: 'ExifTool Online', value: `https://www.metadata2go.com/`, type: 'link' },
    { label: 'Jimpl EXIF', value: `https://jimpl.com/`, type: 'link' },
    { label: '─── AI ANALYSIS', value: '', type: 'info' },
    { label: 'Google Vision AI', value: `https://cloud.google.com/vision/`, type: 'link' },
    { label: 'Hive Moderation', value: `https://hivemoderation.com/image-moderation`, type: 'link' },
    { label: 'AI or Not (Deepfake)', value: `https://www.aiornot.com/`, type: 'link' },
    { label: '─── FORENSICS', value: '', type: 'info' },
    { label: 'FotoForensics', value: isURL ? `https://fotoforensics.com/analysis.php?url=${encoded}` : `https://fotoforensics.com/`, type: 'link' },
    { label: 'Forensically', value: `https://29a.ch/photo-forensics/`, type: 'link' },
    { label: 'izitru (Authenticity)', value: `https://www.izitru.com/`, type: 'link' },
  ];
}

// ── 11. Data Breaches ─────────────────────────────────────────────────────────
export function getBreachResults(query: string): OsintResult[] {
  return [
    { label: '─── BREACH DATABASES', value: '', type: 'info' },
    { label: 'HaveIBeenPwned', value: `https://haveibeenpwned.com/account/${query}`, type: 'link' },
    { label: 'DeHashed', value: `https://dehashed.com/search?query=${query}`, type: 'link' },
    { label: 'LeakCheck', value: `https://leakcheck.io/?query=${query}`, type: 'link' },
    { label: 'Snusbase', value: `https://snusbase.com/`, type: 'link' },
    { label: 'IntelX', value: `https://intelx.io/?s=${query}`, type: 'link' },
    { label: '─── PASTE MONITORING', value: '', type: 'info' },
    { label: 'PasteHunter', value: `https://pastehunter.com/`, type: 'link' },
    { label: 'Pastebin Search', value: `https://pastebin.com/search?q=${query}`, type: 'link' },
    { label: 'GhostBin', value: `https://ghostbin.com/`, type: 'link' },
    { label: '─── DARK WEB MONITORING', value: '', type: 'info' },
    { label: 'Tor2Web (Dark Web)', value: `https://www.onion.ly/`, type: 'link' },
    { label: 'DarkSearch', value: `https://darksearch.io/search?query=${query}`, type: 'link' },
    { label: '─── CREDENTIAL CHECKS', value: '', type: 'info' },
    { label: 'SpyCloud', value: `https://spycloud.com/`, type: 'link' },
    { label: 'BreachDirectory', value: `https://breachdirectory.org/`, type: 'link' },
    { label: '─── THREAT INTEL', value: '', type: 'info' },
    { label: 'VirusTotal', value: `https://www.virustotal.com/gui/search/${query}`, type: 'link' },
    { label: 'Pulsedive', value: `https://pulsedive.com/indicator/?ioc=${query}`, type: 'link' },
  ];
}

// ── 12. Court Records ─────────────────────────────────────────────────────────
export function getCourtResults(query: string): OsintResult[] {
  return [
    { label: '─── FEDERAL COURTS', value: '', type: 'info' },
    { label: 'PACER (Federal)', value: `https://pacer.uscourts.gov/`, type: 'link' },
    { label: 'CourtListener', value: `https://www.courtlistener.com/?q=${query}&type=r`, type: 'link' },
    { label: 'RECAP Archive', value: `https://www.courtlistener.com/?q=${query}&type=d`, type: 'link' },
    { label: 'Justia Federal', value: `https://www.justia.com/search?cx=004471346504245195276:efj_-s5eick&sa=Search&q=${query}`, type: 'link' },
    { label: '─── CRIMINAL RECORDS', value: '', type: 'info' },
    { label: 'National Sex Offender Registry', value: `https://www.nsopw.gov/Search/Results?PersonFirstName=&PersonLastName=${query}`, type: 'link' },
    { label: 'Arrest.org', value: `https://arrest.org/search/?term=${query}`, type: 'link' },
    { label: 'Busted Newspaper', value: `https://bustednewspaper.com/search?q=${query}`, type: 'link' },
    { label: '─── STATE COURTS', value: '', type: 'info' },
    { label: 'UniCourt', value: `https://unicourt.com/search/party?q=${query}`, type: 'link' },
    { label: 'Docket Alarm', value: `https://www.docketalarm.com/search/?q=${query}`, type: 'link' },
    { label: 'Case.net (MO)', value: `https://www.courts.mo.gov/casenet/cases/searchCases.do`, type: 'link' },
    { label: '─── CIVIL & BANKRUPTCY', value: '', type: 'info' },
    { label: 'PACER Bankruptcy', value: `https://pacer.uscourts.gov/`, type: 'link' },
    { label: 'Court Records (Justia)', value: `https://dockets.justia.com/?query=${query}`, type: 'link' },
    { label: 'Law360', value: `https://www.law360.com/search?q=${query}`, type: 'link' },
    { label: '─── LIENS & JUDGMENTS', value: '', type: 'info' },
    { label: 'SearchQuarry Liens', value: `https://www.searchquarry.com/liens/`, type: 'link' },
    { label: 'LienHub', value: `https://www.lienhub.com/`, type: 'link' },
  ];
}
