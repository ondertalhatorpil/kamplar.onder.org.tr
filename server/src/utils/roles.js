// Genel merkez: tüm merkezlerin tüm süreçlerini görür. Eski 'superadmin' /
// 'admin' hesapları da genel merkez yetkisiyle çalışmaya devam eder.
const HQ_ROLES = ['superadmin', 'admin', 'hq_admin'];

const isHQ = (admin) => !!admin && HQ_ROLES.includes(admin.role);
const isCenterAdmin = (admin) => !!admin && admin.role === 'center_admin';

// Rezervasyon sorgularına eklenecek kapsam: kamp merkezi yöneticisi yalnızca
// kendi merkezinin kayıtlarını görür. Merkezi atanmamış bir merkez hesabı hiçbir
// kaydı görmez.
const reservationScope = (admin) => {
  if (!isCenterAdmin(admin)) return {};
  return { camp_center_id: admin.camp_center_id || -1 };
};

const canAccessReservation = (admin, reservation) =>
  !!reservation && (!isCenterAdmin(admin) || reservation.camp_center_id === admin.camp_center_id);

module.exports = { HQ_ROLES, isHQ, isCenterAdmin, reservationScope, canAccessReservation };
