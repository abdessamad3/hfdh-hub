export function businessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = key => parts.find(part => part.type === key).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

