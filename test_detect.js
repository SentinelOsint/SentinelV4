const tests = ['+1 555 000 0000', '555-123-4567', 'google.com', 'Apple Inc', 'Microsoft Corporation'];
const detectInputType = (input) => {
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
};
tests.forEach(t => console.log(t, '->', detectInputType(t)));
