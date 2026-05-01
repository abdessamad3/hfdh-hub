export const formatQuranProgress = (totalHizbs: number, t: any) => {
  const totalUnits = Math.round(totalHizbs * 8);
  if (totalUnits === 0) return `0 ${t('hizbs')}`;
  
  let remaining = totalUnits;
  const hizbs = Math.floor(remaining / 8);
  remaining %= 8;
  
  const nisfs = Math.floor(remaining / 4);
  remaining %= 4;
  
  const rubus = Math.floor(remaining / 2);
  remaining %= 2;
  
  const thumns = remaining;
  
  const parts = [];
  if (hizbs > 0) parts.push(`${hizbs} ${hizbs === 1 ? t('hizb') : t('hizbs')}`);
  if (nisfs > 0) parts.push(`${nisfs} ${t('unit_nisf')}`);
  if (rubus > 0) parts.push(`${rubus} ${t('unit_rubu')}`);
  if (thumns > 0) parts.push(`${thumns} ${t('unit_thumn')}`);
  
  return parts.join(' • ');
};

export const getCoveredThumns = (hizb: number, quantityIdentifier: string): number[] => {
  if (hizb < 1 || hizb > 60) return [];
  const id = quantityIdentifier || '';
  
  if (id.startsWith('t')) {
    const unit = parseInt(id.substring(1));
    return (unit >= 1 && unit <= 8) ? [unit] : [];
  } else if (id.startsWith('r')) {
    const unit = parseInt(id.substring(1));
    // Each Rab' is 2 Thumns
    if (unit === 1) return [1, 2];
    if (unit === 2) return [3, 4];
    if (unit === 3) return [5, 6];
    if (unit === 4) return [7, 8];
  } else if (id.startsWith('n')) {
    const unit = parseInt(id.substring(1));
    // Each Nisf is 4 Thumns
    if (unit === 1) return [1, 2, 3, 4];
    if (unit === 2) return [5, 6, 7, 8];
  } else if (id === 'h' || id === 'h1') {
    // Full Hizb is all 8 Thumns
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }
  return [];
};
