// Sunucudaki utils/roles.js ile aynı ayrım: eski 'superadmin' / 'admin'
// hesapları da genel merkez yetkisindedir.
const HQ_ROLES = ['superadmin', 'admin', 'hq_admin'];

export const isHQ = (admin) => !!admin && HQ_ROLES.includes(admin.role);
export const isCenterAdmin = (admin) => !!admin && admin.role === 'center_admin';

export const getAdminHome = (admin) => (isCenterAdmin(admin) ? '/admin/gelen-talepler' : '/admin/dashboard');

export const getAdminRoleLabel = (admin) =>
  isCenterAdmin(admin) ? (admin.camp_center_name || 'Kamp Merkezi') : 'Genel Merkez';
