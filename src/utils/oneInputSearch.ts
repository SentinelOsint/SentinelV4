/**
 * SENTINEL — One-Input Intelligence Search
 *
 * Single query → automatic input type detection → relevant module aggregation
 *
 * Solo tier: input detection + curated module links
 * Pro tier:  Solo features + AI summary of all findings
 */

export type InputType = 'person' | 'phone' | 'email' | 'ip' | 'domain' | 'company' | 'unknown';

export interface ModuleResult {
  module: string;
  icon: string;
  links: { label: string; url: string }[];
}

export interface OneInputResult {
  query: string;
  inputType: InputType;
  detectedAs: string;
  modules: ModuleResult[];
}

// ─── Input type detection ────────────────────────────────────────────────────

export function detectInputType(input: string): InputType {
  const trimmed = input.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  if (/^[\+]?[\d\s\-\(\)]{7,15}$/.test(trimmed)) return 'phone';
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) return 'ip';
  if (/^[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}$/.test(trimmed) && !trimmed.includes(' ')) return 'domain';
  const companyKeywords = /\b(inc|llc|ltd|corp|company|co\.|group|holdings|enterprises|industries|technologies|tech|solutions|services|associates|partners|international|global)\b/i;
  if (companyKeywords.test(trimmed)) return 'company';
  if (/^[a-zA-ZÀ-ÖØ-öø-ÿ\s\-\'\.]{3,}$/.test(trimmed) && trimmed.includes(' ')) return 'person';
  if (/^[a-zA-Z0-9\s\-\.&,]{2,}$/.test(trimmed)) return 'company';
  return 'unknown';
}

export function getDetectedLabel(type: InputType): string {
  switch (type) {
    case 'person':  return 'Person Name';
    case 'phone':   return 'Phone Number';
    case 'email':   return 'Email Address';
    case 'ip':      return 'IP Address';
    case 'domain':  return 'Domain / Website';
    case 'company': return 'Company / Organization';
    default:        return 'General Query';
  }
}

async function personModules(q: string, isPro: boolean = false): Promise<ModuleResult[]> {
  const enc = encodeURIComponent(q);

  // Wanted checks (Pro only)
  const wantedLinks: { label: string; url: string }[] = [];
  if (isPro) {
    // FBI check
    try {
      const fbiRes = await fetch(`https://api.fbi.gov/wanted/v1/list?title=${enc}`);
      const fbiData = await fbiRes.json();
      const searchName = decodeURIComponent(enc).toLowerCase().trim();
      const fbiMatch = fbiData.items?.find((item: any) => {
        const title = (item.title || '').toLowerCase().trim();
        return title === searchName;
      });
      if (fbiMatch) {
        wantedLinks.push({ label: `🚨 FBI MATCH: ${fbiMatch.title}`, url: fbiMatch.url || 'https://www.fbi.gov/wanted' });
      } else {
        wantedLinks.push({ label: '✅ FBI Most Wanted – No match', url: 'https://www.fbi.gov/wanted' });
      }
    } catch {
      wantedLinks.push({ label: 'FBI Most Wanted', url: 'https://www.fbi.gov/wanted' });
    }

    // Interpol check
    try {
      const nameParts = q.trim().split(' ');
      const forename = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
      const surname = nameParts[nameParts.length - 1] || '';
      const interpolRes = await fetch(`https://sentinel-backend-production-05e1.up.railway.app/interpol/search?forename=${encodeURIComponent(forename)}&name=${encodeURIComponent(surname)}`);
      const interpolData = await interpolRes.json();
      if (interpolData.total > 0) {
        const n = interpolData._embedded.notices[0];
        wantedLinks.push({ label: `🚨 INTERPOL RED NOTICE: ${n.forename} ${n.name}`, url: 'https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices' });
      } else {
        wantedLinks.push({ label: '✅ Interpol Red Notices – No match', url: 'https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices' });
      }
    } catch {
      wantedLinks.push({ label: 'Interpol Red Notices', url: 'https://www.interpol.int/How-we-work/Notices/Red-Notices/View-Red-Notices' });
    }
  }

  // Auto person intelligence
  const personAutoLinks: { label: string; url: string }[] = [];
  try {
    // Google Knowledge Graph check
    const googleRes = await fetch(`https://kgsearch.googleapis.com/v1/entities:search?query=${enc}&limit=1&key=AIzaSyBC3110xUO4fOpNj1BCawuevrdtFevnQlo`);
    const googleData = await googleRes.json();
    if (googleData.itemListElement && googleData.itemListElement.length > 0) {
      const entity = googleData.itemListElement[0].result;
      personAutoLinks.push({ label: `✅ Google Knowledge: ${entity.name}`, url: `https://www.google.com/search?q="${enc}"` });
      if (entity.description) personAutoLinks.push({ label: `📋 ${entity.description}`, url: `https://www.google.com/search?q="${enc}"` });
    } else {
      personAutoLinks.push({ label: `🔍 Google: Search "${q}"`, url: `https://www.google.com/search?q="${enc}"` });
      personAutoLinks.push({ label: `📰 Google News: "${q}"`, url: `https://news.google.com/search?q=${enc}` });
      personAutoLinks.push({ label: `🔗 LinkedIn: "${q}"`, url: `https://www.linkedin.com/search/results/people/?keywords=${enc}` });
    }
  } catch {
    personAutoLinks.push({ label: `🔍 Google: Search "${q}"`, url: `https://www.google.com/search?q="${enc}"` });
    personAutoLinks.push({ label: `🔗 LinkedIn: "${q}"`, url: `https://www.linkedin.com/search/results/people/?keywords=${enc}` });
  }

  return [
    {
      module: '👤 PERSON INTELLIGENCE', icon: '👤',
      links: personAutoLinks,
    },
    ...(isPro && wantedLinks.length > 0 ? [{
      module: '🚨 WANTED CHECKS', icon: '🚨',
      links: wantedLinks,
    }] : []),
    {
      module: 'Person Search', icon: '👤',
      links: [
        { label: 'TruthFinder',      url: `https://www.truthfinder.com/results/?firstName=${enc}` },
        { label: 'Spokeo',           url: `https://www.spokeo.com/search?q=${enc}` },
        { label: 'WhitePages',       url: `https://www.whitepages.com/name/${enc}` },
        { label: 'FastPeopleSearch', url: `https://www.fastpeoplesearch.com/name/${enc}` },
        { label: 'Intelius',         url: `https://www.intelius.com/people-search/` },
        { label: 'Pipl',             url: `https://pipl.com/search/?q=${enc}&in=5` },
        { label: 'PeopleFinder',     url: `https://www.peoplefinder.com/search/?full_name=${enc}` },
        { label: 'ZabaSearch',       url: `https://www.zabasearch.com/people/${enc}/` },
      ],
    },
    {
      module: 'Social Media', icon: '📱',
      links: [
        { label: 'LinkedIn',         url: `https://www.linkedin.com/search/results/people/?keywords=${enc}` },
        { label: 'Facebook',         url: `https://www.facebook.com/search/people/?q=${enc}` },
        { label: 'Twitter/X',        url: `https://twitter.com/search?q=${enc}&f=user` },
        { label: 'Instagram',        url: `https://www.instagram.com/explore/tags/${enc}/` },
        { label: 'TikTok',           url: `https://www.tiktok.com/search/user?q=${enc}` },
        { label: 'Snapchat',         url: `https://www.snapchat.com/add/${enc}` },
        { label: 'Threads',          url: `https://www.threads.net/search?q=${enc}` },
        { label: 'YouTube Channels', url: `https://www.youtube.com/results?search_query=${enc}&sp=EgIQAg%253D%253D` },
        { label: 'YouTube Videos',   url: `https://www.youtube.com/results?search_query=${enc}` },
        { label: 'Reddit',           url: `https://www.reddit.com/search/?q=${enc}&type=user` },
        { label: 'Pinterest',        url: `https://www.pinterest.com/search/users/?q=${enc}` },
      ],
    },
    {
      module: 'News & Web', icon: '📰',
      links: [
        { label: 'Google Search',    url: `https://www.google.com/search?q="${enc}"` },
        { label: 'Google News',      url: `https://news.google.com/search?q=${enc}` },
        { label: 'Bing',             url: `https://www.bing.com/search?q="${enc}"` },
        { label: 'DuckDuckGo',       url: `https://duckduckgo.com/?q="${enc}"` },
        { label: 'Wayback Machine',  url: `https://web.archive.org/web/*/${enc}` },
      ],
    },
    {
      module: 'Professional', icon: '💼',
      links: [
        { label: 'ZoomInfo',         url: `https://www.zoominfo.com/s/#!search/people/${enc}` },
        { label: 'Pipl',             url: `https://pipl.com/search/?q=${enc}` },
        { label: 'NIPR Licenses',    url: `https://nipr.com/` },
        { label: 'PACER Federal',    url: `https://pacer.uscourts.gov/` },
      ],
    },
    {
      module: 'Court Records', icon: '⚖️',
      links: [
        { label: 'PACER',            url: 'https://pacer.uscourts.gov/' },
        { label: 'CourtListener',    url: `https://www.courtlistener.com/?q=${enc}` },
        { label: 'UniCourt',         url: `https://unicourt.com/search#q=${enc}` },
        { label: 'Google Scholar',   url: `https://scholar.google.com/scholar?q=${enc}` },
      ],
    },
    {
      module: 'Data Breaches', icon: '🔓',
      links: [
        { label: 'HaveIBeenPwned',   url: `https://haveibeenpwned.com/` },
        { label: 'DeHashed',         url: `https://dehashed.com/search?query=${enc}` },
        { label: 'BreachDirectory',  url: `https://breachdirectory.org/` },
      ],
    },
  ];
}

async function phoneModules(q: string): Promise<ModuleResult[]> {
  const enc = encodeURIComponent(q);
  const digits = q.replace(/\D/g, '');

  // Auto phone intelligence
  const phoneAutoLinks: { label: string; url: string }[] = [];
  try {
    const res = await fetch(`https://phonevalidate.com/api?phone=${digits}&apikey=free`);
    const data = await res.json();
    if (data && data.country_code) {
      phoneAutoLinks.push({ label: `🌍 Country: ${data.country_name || data.country_code}`, url: `https://www.numlookup.com/?number=${enc}` });
      phoneAutoLinks.push({ label: `📡 Carrier: ${data.carrier || 'Unknown'}`, url: `https://www.numlookup.com/?number=${enc}` });
      phoneAutoLinks.push({ label: `📱 Type: ${data.line_type || 'Unknown'}`, url: `https://www.numlookup.com/?number=${enc}` });
      if (data.country_code === 'CA') {
        phoneAutoLinks.push({ label: '🍁 Canadian number detected', url: `https://www.numlookup.com/?number=${enc}` });
      } else if (data.country_code === 'US') {
        phoneAutoLinks.push({ label: '🇺🇸 US number detected', url: `https://www.numlookup.com/?number=${enc}` });
      }
    } else {
      // Fallback - detect from number format
      if (digits.startsWith('1') && digits.length === 11) {
        phoneAutoLinks.push({ label: '🌍 North American number (US/Canada)', url: `https://www.numlookup.com/?number=${enc}` });
      } else {
        phoneAutoLinks.push({ label: `📞 ${digits.length} digit number`, url: `https://www.numlookup.com/?number=${enc}` });
      }
    }
  } catch {
    phoneAutoLinks.push({ label: `📞 Number: ${q}`, url: `https://www.numlookup.com/?number=${enc}` });
  }

  return [
    {
      module: '📞 PHONE INTELLIGENCE', icon: '📞',
      links: phoneAutoLinks,
    },
    {
      module: 'Phone Lookup', icon: '📞',
      links: [
        { label: 'NumLookup',        url: `https://www.numlookup.com/?number=${enc}` },
        { label: 'Truecaller',       url: `https://www.truecaller.com/search/us/${digits}` },
        { label: 'WhitePages',       url: `https://www.whitepages.com/phone/${digits}` },
        { label: 'CallerSmart',      url: `https://www.callersmart.com/lookup/${digits}` },
        { label: 'SpamCalls',        url: `https://spamcalls.net/en/search?number=${enc}` },
        { label: 'Sync.me',          url: `https://sync.me/search/?number=${enc}` },
      ],
    },
    {
      module: 'Carrier & Identity', icon: '📡',
      links: [
        { label: 'Twilio Lookup',    url: `https://www.twilio.com/lookup` },
        { label: 'FreeCarrierLookup', url: `https://freecarrierlookup.com/` },
      ],
    },
    {
      module: 'Social Media', icon: '📱',
      links: [
        { label: 'Telegram',         url: `https://t.me/${digits}` },
        { label: 'WhatsApp',         url: `https://wa.me/${digits}` },
        { label: 'Google search',    url: `https://www.google.com/search?q="${enc}"` },
      ],
    },
    {
      module: 'Spam & Fraud', icon: '⚠️',
      links: [
        { label: 'Should I Answer',  url: `https://www.shouldianswer.com/phone-number/${digits}` },
        { label: '800notes',         url: `https://800notes.com/Phone.aspx/${digits}` },
        { label: 'WhoCalledMe',      url: `https://whocalled.us/lookup/${digits}` },
      ],
    },
  ];
}

async function emailModules(q: string): Promise<ModuleResult[]> {
  const enc = encodeURIComponent(q);
  const domain = q.split('@')[1] ?? '';

  // Auto breach check
  const breachLinks: { label: string; url: string }[] = [];
  try {
    const res = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${enc}?truncateResponse=false`, {
      headers: { 'hibp-api-key': 'sentinel-free-check', 'User-Agent': 'Sentinel-OSINT' }
    });
    if (res.status === 200) {
      const data = await res.json();
      breachLinks.push({ label: `🚨 BREACHED: Found in ${data.length} breach(es)!`, url: `https://haveibeenpwned.com/account/${enc}` });
      data.slice(0, 3).forEach((b: any) => {
        breachLinks.push({ label: `⚠️ ${b.Name} (${b.BreachDate?.slice(0,4)})`, url: `https://haveibeenpwned.com/account/${enc}` });
      });
    } else if (res.status === 404) {
      breachLinks.push({ label: '✅ HaveIBeenPwned – No breaches found', url: `https://haveibeenpwned.com/account/${enc}` });
    } else {
      breachLinks.push({ label: 'HaveIBeenPwned – Check manually', url: `https://haveibeenpwned.com/account/${enc}` });
    }
  } catch {
    breachLinks.push({ label: 'HaveIBeenPwned', url: `https://haveibeenpwned.com/account/${enc}` });
  }

  return [
    {
      module: '🔓 BREACH CHECK', icon: '🔓',
      links: breachLinks,
    },
    {
      module: 'Email Lookup', icon: '✉️',
      links: [
        { label: 'HaveIBeenPwned',   url: `https://haveibeenpwned.com/account/${enc}` },
        { label: 'Hunter.io',        url: `https://hunter.io/email-verifier/${enc}` },
        { label: 'EmailRep',         url: `https://emailrep.io/${enc}` },
        { label: 'DeHashed',         url: `https://dehashed.com/search?query=${enc}` },
        { label: 'Gravatar',         url: `https://en.gravatar.com/search#q=${enc}` },
        { label: 'BreachDirectory',  url: `https://breachdirectory.org/` },
      ],
    },
    {
      module: 'Domain & WHOIS', icon: '🔗',
      links: [
        { label: 'WHOIS domain',     url: `https://www.whois.com/whois/${domain}` },
        { label: 'MXToolbox',        url: `https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${encodeURIComponent(domain)}` },
        { label: 'SecurityTrails',   url: `https://securitytrails.com/domain/${domain}/dns` },
      ],
    },
    {
      module: 'Social Media', icon: '📱',
      links: [
        { label: 'LinkedIn',         url: `https://www.linkedin.com/search/results/people/?keywords=${enc}` },
        { label: 'Twitter/X',        url: `https://twitter.com/search?q=${enc}` },
        { label: 'Google search',    url: `https://www.google.com/search?q="${enc}"` },
      ],
    },
  ];
}

async function ipModules(q: string): Promise<ModuleResult[]> {
  const enc = encodeURIComponent(q);

  // Auto IP lookup
  const ipAutoLinks: { label: string; url: string }[] = [];
  try {
    const res = await fetch(`https://ipapi.co/${enc}/json/`);
    const data = await res.json();
    if (data && data.ip && !data.error) {
      ipAutoLinks.push({ label: `📍 ${data.city || '?'}, ${data.region || '?'}, ${data.country_name || '?'}`, url: `https://ipapi.co/${enc}/json/` });
      ipAutoLinks.push({ label: `🏢 ISP: ${data.org || 'Unknown'}`, url: `https://ipapi.co/${enc}/json/` });
      ipAutoLinks.push({ label: `🌐 ASN: ${data.asn || 'Unknown'}`, url: `https://ipapi.co/${enc}/json/` });
      if (data.timezone) ipAutoLinks.push({ label: `🕐 Timezone: ${data.timezone}`, url: `https://ipapi.co/${enc}/json/` });
    } else {
      ipAutoLinks.push({ label: '⚠️ Could not resolve IP data', url: `https://ipapi.co/${enc}/json/` });
    }
  } catch {
    ipAutoLinks.push({ label: 'IP Lookup failed', url: `https://ipapi.co/${enc}/json/` });
  }

  return [
    {
      module: '🌐 IP INTELLIGENCE', icon: '🌐',
      links: ipAutoLinks,
    },
    {
      module: 'IP & Network', icon: '🌐',
      links: [
        { label: 'IPinfo',           url: `https://ipinfo.io/${enc}` },
        { label: 'Shodan',           url: `https://www.shodan.io/host/${enc}` },
        { label: 'AbuseIPDB',        url: `https://www.abuseipdb.com/check/${enc}` },
        { label: 'VirusTotal',       url: `https://www.virustotal.com/gui/ip-address/${enc}` },
        { label: 'BGPView',          url: `https://bgpview.io/ip/${enc}` },
        { label: 'Censys',           url: `https://search.censys.io/hosts/${enc}` },
        { label: 'GreyNoise',        url: `https://viz.greynoise.io/ip/${enc}` },
        { label: 'Talos Intel',      url: `https://talosintelligence.com/reputation_center/lookup?search=${enc}` },
      ],
    },
    {
      module: 'Geo / OSINT', icon: '📍',
      links: [
        { label: 'IP Geolocation',   url: `https://www.iplocation.net/?query=${enc}` },
        { label: 'IPapi',            url: `https://ipapi.co/${enc}/json/` },
        { label: 'Google Maps',      url: `https://maps.google.com/?q=${enc}` },
      ],
    },
    {
      module: 'Threat Intel', icon: '🛡️',
      links: [
        { label: 'OTX AlienVault',   url: `https://otx.alienvault.com/indicator/ip/${enc}` },
        { label: 'Pulsedive',        url: `https://pulsedive.com/indicator/?ioc=${enc}` },
        { label: 'URLhaus',          url: `https://urlhaus.abuse.ch/browse.php?search=${enc}` },
      ],
    },
  ];
}

async function domainModules(q: string): Promise<ModuleResult[]> {
  const enc = encodeURIComponent(q);

  // Auto domain intelligence via DNS
  const domainAutoLinks: { label: string; url: string }[] = [];
  try {
    const res = await fetch(`https://dns.google/resolve?name=${enc}&type=A`);
    const data = await res.json();
    if (data && data.Answer && data.Answer.length > 0) {
      const ip = data.Answer[0].data;
      domainAutoLinks.push({ label: `✅ Domain resolves to: ${ip}`, url: `https://ipapi.co/${ip}/json/` });
      // Get IP info
      try {
        const ipRes = await fetch(`https://ipapi.co/${ip}/json/`);
        const ipData = await ipRes.json();
        if (ipData && ipData.org) {
          domainAutoLinks.push({ label: `🏢 Hosted by: ${ipData.org}`, url: `https://ipapi.co/${ip}/json/` });
          domainAutoLinks.push({ label: `📍 Server location: ${ipData.city || '?'}, ${ipData.country_name || '?'}`, url: `https://ipapi.co/${ip}/json/` });
        }
      } catch {}
    } else {
      domainAutoLinks.push({ label: '⚠️ Domain does not resolve (may be offline)', url: `https://www.whois.com/whois/${enc}` });
    }
    // Check .ca domains
    if (q.endsWith('.ca')) {
      domainAutoLinks.push({ label: '🍁 Canadian domain (.ca)', url: `https://www.cira.ca/` });
    }
  } catch {
    domainAutoLinks.push({ label: `🔗 Domain: ${q}`, url: `https://www.whois.com/whois/${enc}` });
  }

  return [
    {
      module: '🔗 DOMAIN INTELLIGENCE', icon: '🔗',
      links: domainAutoLinks,
    },
    {
      module: 'Domain & WHOIS', icon: '🔗',
      links: [
        { label: 'WHOIS',            url: `https://www.whois.com/whois/${enc}` },
        { label: 'DomainTools',      url: `https://whois.domaintools.com/${enc}` },
        { label: 'SecurityTrails',   url: `https://securitytrails.com/domain/${enc}/dns` },
        { label: 'BuiltWith',        url: `https://builtwith.com/${enc}` },
        { label: 'Wayback Machine',  url: `https://web.archive.org/web/*/${enc}` },
        { label: 'DNSDumpster',      url: `https://dnsdumpster.com/` },
        { label: 'crt.sh (SSL)',     url: `https://crt.sh/?q=${enc}` },
      ],
    },
    {
      module: 'IP & Network', icon: '🌐',
      links: [
        { label: 'Shodan',           url: `https://www.shodan.io/search?query=${enc}` },
        { label: 'VirusTotal',       url: `https://www.virustotal.com/gui/domain/${enc}` },
        { label: 'Censys',           url: `https://search.censys.io/certificates?q=${enc}` },
        { label: 'URLScan.io',       url: `https://urlscan.io/search/#domain:${enc}` },
      ],
    },
    {
      module: 'Reputation & History', icon: '🕐',
      links: [
        { label: 'Google Safe Browsing', url: `https://transparencyreport.google.com/safe-browsing/search?url=${enc}` },
        { label: 'OTX AlienVault',   url: `https://otx.alienvault.com/indicator/domain/${enc}` },
        { label: 'Talos Intel',      url: `https://talosintelligence.com/reputation_center/lookup?search=${enc}` },
      ],
    },
    {
      module: 'Company Intel', icon: '🏢',
      links: [
        { label: 'OpenCorporates',   url: `https://opencorporates.com/companies?q=${enc}` },
        { label: 'LinkedIn',         url: `https://www.linkedin.com/search/results/companies/?keywords=${enc}` },
        { label: 'Crunchbase',       url: `https://www.crunchbase.com/textsearch?q=${enc}` },
      ],
    },
  ];
}

async function companyModules(q: string): Promise<ModuleResult[]> {
  const enc = encodeURIComponent(q);

  // Auto corporate intelligence
  const corpAutoLinks: { label: string; url: string }[] = [];
  try {
    // SEC EDGAR full-text search
    const secRes = await fetch(`https://efts.sec.gov/LATEST/search-index?q="${enc}"&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q,8-K`);
    const secData = await secRes.json();
    if (secData.hits?.hits?.length > 0) {
      const hit = secData.hits.hits[0]._source;
      corpAutoLinks.push({ label: `📊 SEC Filing: ${hit.display_names?.[0] || q}`, url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${enc}&action=getcompany` });
      corpAutoLinks.push({ label: `📋 Latest filing: ${hit.file_date || 'Unknown date'}`, url: `https://efts.sec.gov/LATEST/search-index?q="${enc}"` });
    } else {
      corpAutoLinks.push({ label: `🔍 SEC EDGAR: Search ${q}`, url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${enc}&action=getcompany` });
    }
  } catch {
    corpAutoLinks.push({ label: `📊 SEC EDGAR`, url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${enc}&action=getcompany` });
  }

  try {
    // OpenCorporates API
    const ocRes = await fetch(`https://api.opencorporates.com/v0.4/companies/search?q=${enc}&jurisdiction_code=us`);
    const ocData = await ocRes.json();
    if (ocData.results?.companies?.length > 0) {
      const co = ocData.results.companies[0].company;
      corpAutoLinks.push({ label: `✅ Found: ${co.name} (${co.jurisdiction_code?.toUpperCase()})`, url: co.opencorporates_url || `https://opencorporates.com/companies?q=${enc}` });
      corpAutoLinks.push({ label: `📍 Status: ${co.current_status || 'Unknown'}`, url: co.opencorporates_url || `https://opencorporates.com/companies?q=${enc}` });
    } else {
      // Try Canada
      const ocCaRes = await fetch(`https://api.opencorporates.com/v0.4/companies/search?q=${enc}&jurisdiction_code=ca`);
      const ocCaData = await ocCaRes.json();
      if (ocCaData.results?.companies?.length > 0) {
        const co = ocCaData.results.companies[0].company;
        corpAutoLinks.push({ label: `🍁 Found in Canada: ${co.name}`, url: co.opencorporates_url || `https://opencorporates.com/companies?q=${enc}` });
        corpAutoLinks.push({ label: `📍 Status: ${co.current_status || 'Unknown'}`, url: co.opencorporates_url || `https://opencorporates.com/companies?q=${enc}` });
      } else {
        corpAutoLinks.push({ label: `🔍 OpenCorporates: No match found`, url: `https://opencorporates.com/companies?q=${enc}` });
      }
    }
  } catch {
    corpAutoLinks.push({ label: `🏢 OpenCorporates`, url: `https://opencorporates.com/companies?q=${enc}` });
  }

  return [
    {
      module: '🏢 CORPORATE INTELLIGENCE', icon: '🏢',
      links: corpAutoLinks,
    },
    {
      module: 'Company Search', icon: '🏢',
      links: [
        { label: 'SEC EDGAR',        url: `https://www.sec.gov/cgi-bin/browse-edgar?company=${enc}&action=getcompany` },
        { label: 'OpenCorporates',   url: `https://opencorporates.com/companies?q=${enc}` },
        { label: 'Crunchbase',       url: `https://www.crunchbase.com/textsearch?q=${enc}` },
        { label: 'LinkedIn',         url: `https://www.linkedin.com/search/results/companies/?keywords=${enc}` },
        { label: 'Bloomberg',        url: `https://www.bloomberg.com/search?query=${enc}` },
        { label: 'Corporations Canada', url: `https://www.ic.gc.ca/app/scr/cc/CorporationsCanada/fdrlCrpSrch.html?filingTypeCode=ANY&searchNameType=ALL&clientAction=doSearch&name=${enc}` },
        { label: 'NUANS (Canada)',   url: `https://www.nuans.com/site/nuans/en/home` },
        { label: 'BBB',              url: `https://www.bbb.org/search?find_text=${enc}` },
        { label: 'Dun & Bradstreet', url: `https://www.dnb.com/business-directory/company-search.html?keyword=${enc}` },
      ],
    },
    {
      module: 'Financial & Legal', icon: '💰',
      links: [
        { label: 'PACER (Federal)',  url: `https://pcl.uscourts.gov/pcl/pages/search/findParty.jsf` },
        { label: 'Court Listener',  url: `https://www.courtlistener.com/?q=${enc}&type=r` },
        { label: 'OFAC Sanctions',  url: `https://sanctionssearch.ofac.treas.gov/` },
        { label: 'FBI Most Wanted', url: `https://www.fbi.gov/wanted` },
      ],
    },
  ];
}

function unknownModules(q: string): ModuleResult[] {
  const enc = encodeURIComponent(q);
  return [
    {
      module: 'General Search', icon: '🔍',
      links: [
        { label: 'Google',           url: `https://www.google.com/search?q="${enc}"` },
        { label: 'Bing',             url: `https://www.bing.com/search?q="${enc}"` },
        { label: 'DuckDuckGo',       url: `https://duckduckgo.com/?q="${enc}"` },
        { label: 'Yandex',           url: `https://yandex.com/search/?text="${enc}"` },
        { label: 'Brave Search',     url: `https://search.brave.com/search?q="${enc}"` },
        { label: 'Google News',      url: `https://news.google.com/search?q=${enc}` },
      ],
    },
    {
      module: 'OSINT Tools', icon: '🔭',
      links: [
        { label: 'Maltego',          url: `https://www.maltego.com/` },
        { label: 'IntelTechniques',  url: `https://inteltechniques.com/tools/` },
        { label: 'OSINT Framework',  url: `https://osintframework.com/` },
      ],
    },
  ];
}

// ─── Main aggregator ─────────────────────────────────────────────────────────

export async function buildOneInputResult(query: string, isPro: boolean = false): Promise<OneInputResult> {
  // Multi-input merge: split by newlines and detect each identifier
  const lines = query.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length > 1) {
    // Multiple identifiers detected
    const types = lines.map(l => ({ line: l, type: detectInputType(l) }));
    const modulesList: ModuleResult[] = [];
    
    // Add merge summary
    const mergeLinks = types.map(t => ({
      label: `${t.type === 'person' ? '👤' : t.type === 'phone' ? '📞' : t.type === 'email' ? '✉️' : t.type === 'ip' ? '🌐' : t.type === 'domain' ? '🔗' : '🏢'} ${t.line} → ${getDetectedLabel(t.type)}`,
      url: `https://www.google.com/search?q="${encodeURIComponent(t.line)}"`
    }));
    modulesList.push({ module: '🔗 MULTI-IDENTIFIER INVESTIGATION', icon: '🔗', links: mergeLinks });

    // Connections graph
    const connectionLinks: { label: string; url: string }[] = [];
    const person = types.find(t => t.type === 'person');
    const phone = types.find(t => t.type === 'phone');
    const email = types.find(t => t.type === 'email');
    const domain = types.find(t => t.type === 'domain');
    const ip = types.find(t => t.type === 'ip');

    if (person && phone) connectionLinks.push({ label: `👤 ${person.line} ↔ 📞 ${phone.line}`, url: `https://www.google.com/search?q="${encodeURIComponent(person.line)}"+"${encodeURIComponent(phone.line)}"` });
    if (person && email) connectionLinks.push({ label: `👤 ${person.line} ↔ ✉️ ${email.line}`, url: `https://www.google.com/search?q="${encodeURIComponent(person.line)}"+"${encodeURIComponent(email.line)}"` });
    if (person && domain) connectionLinks.push({ label: `👤 ${person.line} ↔ 🔗 ${domain.line}`, url: `https://www.google.com/search?q="${encodeURIComponent(person.line)}"+"${encodeURIComponent(domain.line)}"` });
    if (email && domain) connectionLinks.push({ label: `✉️ ${email.line} ↔ 🔗 ${domain.line}`, url: `https://www.google.com/search?q="${encodeURIComponent(email.line)}"+"${encodeURIComponent(domain.line)}"` });
    if (phone && email) connectionLinks.push({ label: `📞 ${phone.line} ↔ ✉️ ${email.line}`, url: `https://www.google.com/search?q="${encodeURIComponent(phone.line)}"+"${encodeURIComponent(email.line)}"` });
    if (ip && domain) connectionLinks.push({ label: `🌐 ${ip.line} ↔ 🔗 ${domain.line}`, url: `https://www.google.com/search?q="${encodeURIComponent(ip.line)}"+"${encodeURIComponent(domain.line)}"` });

    if (connectionLinks.length > 0) {
      connectionLinks.unshift({ label: `🔍 Cross-reference all identifiers`, url: `https://www.google.com/search?q=${types.map(t => `"${encodeURIComponent(t.line)}"`).join('+')}` });
      modulesList.push({ module: '🕸️ CONNECTIONS', icon: '🕸️', links: connectionLinks });
    }

    // Run each identifier
    for (const { line, type } of types) {
      const subResult = await buildOneInputResult(line, isPro);
      // Add first auto-intelligence module from each
      if (subResult.modules.length > 0) {
        modulesList.push({
          ...subResult.modules[0],
          module: `${subResult.modules[0].module} (${line})`
        });
      }
    }

    return {
      query,
      inputType: 'unknown',
      detectedAs: `Multi-identifier (${lines.length} inputs)`,
      modules: modulesList,
    };
  }

  const inputType = detectInputType(query);

  let modules: ModuleResult[];
  switch (inputType) {
    case 'phone':   modules = await phoneModules(query);   break;
    case 'person':  modules = await personModules(query, isPro);  break;
    case 'email':   modules = await emailModules(query);   break;
    case 'ip':      modules = await ipModules(query);      break;
    case 'domain':  modules = await domainModules(query);  break;
    case 'company': modules = await companyModules(query); break;
    default:        modules = unknownModules(query); break;
  }

  return {
    query,
    inputType,
    detectedAs: getDetectedLabel(inputType),
    modules,
  };
}
