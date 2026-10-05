const { Op, fn, col } = require('sequelize');
const { Reservation, CampCenter } = require('../models');
const { withDisplayStatus, IN_REVIEW_STATUSES, documentsCompleteWhere } = require('../utils/reservationStatus');

const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalReservations,
      pendingReservations,
      approvedReservations,
      rejectedReservations,
      documentPending,
      documentComplete,
      bursaCount,
      buyukcekmeceCount,
      thisMonthParticipants,
      todayCheckIn,
      todayCheckOut,
      recentReservations
    ] = await Promise.all([
      Reservation.count(),
      Reservation.count({ where: { status: { [Op.in]: IN_REVIEW_STATUSES } } }),
      Reservation.count({ where: { status: 'APPROVED' } }),
      Reservation.count({ where: { status: 'REJECTED' } }),
      // Belge sayaçları listelerdeki durumla aynı mantığı kullanır (muvafakatname ve reddedilen belgeler dahil)
      Reservation.count({
        where: { [Op.and]: [{ status: 'APPROVED', document_upload_token: { [Op.ne]: null } }, { [Op.not]: documentsCompleteWhere }] }
      }),
      Reservation.count({
        where: { [Op.and]: [{ status: 'APPROVED', document_upload_token: { [Op.ne]: null } }, documentsCompleteWhere] }
      }),
      Reservation.count({ where: { camp_center_id: 1 } }),
      Reservation.count({ where: { camp_center_id: 2 } }),
      Reservation.sum('participant_count', {
        where: {
          status: 'APPROVED',
          start_datetime: { [Op.lte]: endOfMonth },
          end_datetime: { [Op.gte]: startOfMonth }
        }
      }),
      Reservation.findAll({
        where: {
          status: 'APPROVED',
          start_datetime: { [Op.gte]: startOfToday, [Op.lte]: endOfToday }
        },
        include: [{ model: CampCenter, as: 'campCenter', attributes: ['name'] }],
        attributes: ['id', 'reservation_number', 'authorized_first_name', 'authorized_last_name', 'participant_count', 'start_datetime']
      }),
      Reservation.findAll({
        where: {
          status: 'APPROVED',
          end_datetime: { [Op.gte]: startOfToday, [Op.lte]: endOfToday }
        },
        include: [{ model: CampCenter, as: 'campCenter', attributes: ['name'] }],
        attributes: ['id', 'reservation_number', 'authorized_first_name', 'authorized_last_name', 'participant_count', 'end_datetime']
      }),
      Reservation.findAll({
        include: [{ model: CampCenter, as: 'campCenter', attributes: ['id', 'name'] }],
        order: [['created_at', 'DESC']],
        limit: 10
      })
    ]);

    return res.json({
      success: true,
      data: {
        summary: {
          total: totalReservations,
          pending: pendingReservations,
          approved: approvedReservations,
          rejected: rejectedReservations,
          document_pending: documentPending,
          document_complete: documentComplete,
          bursa: bursaCount,
          buyukcekmece: buyukcekmeceCount,
          this_month_participants: thisMonthParticipants || 0
        },
        today_check_in: todayCheckIn,
        today_check_out: todayCheckOut,
        recent_reservations: recentReservations.map(withDisplayStatus)
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Dashboard verisi yüklenirken hata oluştu.' });
  }
};

module.exports = { getDashboard };
