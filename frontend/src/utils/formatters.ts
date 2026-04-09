import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ar, enUS, fr } from 'date-fns/locale';

export const getDateLocale = (language: 'ar' | 'en' | 'fr') => {
  switch (language) {
    case 'ar':
      return ar;
    case 'fr':
      return fr;
    default:
      return enUS;
  }
};

export const formatMessageTime = (
  date: string | Date,
  language: 'ar' | 'en' | 'fr' = 'en'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getDateLocale(language);

  if (isToday(dateObj)) {
    return format(dateObj, 'HH:mm', { locale });
  } else if (isYesterday(dateObj)) {
    return language === 'ar' ? 'أمس' : language === 'fr' ? 'Hier' : 'Yesterday';
  } else {
    return format(dateObj, 'dd/MM/yyyy', { locale });
  }
};

export const formatLastSeen = (
  date: string | Date,
  language: 'ar' | 'en' | 'fr' = 'en'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getDateLocale(language);

  return formatDistanceToNow(dateObj, { addSuffix: true, locale });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 12 && cleaned.startsWith('966')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }

  return phone;
};

export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
};