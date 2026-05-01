import { format } from 'date-fns';

export const formatDate = (date: Date | string | number | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'dd/MM/yyyy');
  } catch (e) {
    return 'N/A';
  }
};
