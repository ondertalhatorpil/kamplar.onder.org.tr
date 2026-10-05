import { format, differenceInDays, differenceInHours, eachDayOfInterval, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

export const formatDate = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'd MMMM yyyy', { locale: tr });
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'd MMMM yyyy, HH:mm', { locale: tr });
};

export const formatDateShort = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd.MM.yyyy', { locale: tr });
};

export const formatTime = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'HH:mm', { locale: tr });
};

export const getDaysBetween = (start, end) => {
  const days = eachDayOfInterval({ start: new Date(start), end: new Date(end) });
  return days;
};

export const getStatusLabel = (status) => {
  const labels = {
    PENDING: 'Merkez İncelemesinde',
    FORWARDED: 'Genel Merkezde',
    HQ_APPROVED: 'Son Onay Bekliyor',
    DOCUMENTS_PENDING: 'Belge Bekleniyor',
    DOCUMENTS_IN_REVIEW: 'Belge İncelemede',
    APPROVED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal Edildi',
    COMPLETED: 'Tamamlandı',
  };
  return labels[status] || status;
};

export const getStatusClass = (status) => {
  const classes = {
    PENDING: 'badge-pending',
    FORWARDED: 'badge-forwarded',
    HQ_APPROVED: 'badge-hq-approved',
    DOCUMENTS_PENDING: 'badge-documents-pending',
    DOCUMENTS_IN_REVIEW: 'badge-documents-review',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    CANCELLED: 'badge-cancelled',
    COMPLETED: 'badge-completed',
  };
  return classes[status] || 'badge-cancelled';
};

export const getDocStatusLabel = (status) => {
  const labels = {
    NOT_UPLOADED: 'Yüklenmedi',
    UPLOADED: 'Yüklendi',
    VALIDATED: 'Doğrulandı',
    APPROVED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    ERROR: 'Hata',
  };
  return labels[status] || status;
};

export const getGenderLabel = (gender) => {
  if (gender === 'kiz') return 'Kız';
  if (gender === 'erkek') return 'Erkek';
  return '-';
};

export const getGroupCompositionLabel = (composition) => {
  const labels = {
    mixed: 'Karma',
    female_only: 'Sadece Kadın',
    male_only: 'Sadece Erkek',
  };
  return labels[composition] || '-';
};

export const getEducationLevelLabel = (level) => {
  const labels = {
    ilkokul: 'İlkokul',
    ortaokul: 'Ortaokul',
    lise: 'Lise',
    universite: 'Üniversite',
    diger: 'Diğer',
    under_18: '18 Yaş Altı',
  };
  return labels[level] || '-';
};

export const getGroupNatureLabel = (nature) => {
  const labels = {
    student_group: 'Öğrenci Grubu',
    youth_organization: 'Gençlik Organizasyonu',
    ngo: 'Sivil Toplum Kuruluşu',
    corporate: 'Kurumsal',
    religious_group: 'Dini Grup',
    other: 'Diğer',
  };
  return labels[nature] || '-';
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const combineDatetime = (date, time) => {
  if (!date || !time) return null;
  return `${date}T${time}:00`;
};
