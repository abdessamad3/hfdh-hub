import { format, parseISO, startOfDay } from 'date-fns';

export const formatDate = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'dd/MM/yyyy');
  } catch (e) {
    return 'N/A';
  }
};

export const isToday = (dateStr: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
};

export const getDayIndex = (dateStr: string): number => {
  if (!dateStr) return -1;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return -1;
  // Use local time fields to avoid UTC shifts
  return new Date(year, month - 1, day).getDay();
};
