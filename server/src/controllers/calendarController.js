const { Op } = require('sequelize');
const { withDisplayStatus, IN_REVIEW_STATUSES } = require('../utils/reservationStatus');
const { Reservation, CampCenter } = require('../models');

const getCalendar = async (req, res) => {
  try {
    const { start_date, end_date, camp_center_id } = req.query;

    const where = {
      status: { [Op.in]: [...IN_REVIEW_STATUSES, 'APPROVED'] }
    };

    if (camp_center_id) where.camp_center_id = camp_center_id;

    if (start_date && end_date) {
      where[Op.and] = [
        { start_datetime: { [Op.lte]: new Date(end_date + 'T23:59:59') } },
        { end_datetime: { [Op.gte]: new Date(start_date + 'T00:00:00') } }
      ];
    }

    const reservations = await Reservation.findAll({
      where,
      include: [{ model: CampCenter, as: 'campCenter', attributes: ['id', 'name', 'city', 'capacity'] }],
      order: [['start_datetime', 'ASC']]
    });

    return res.json({ success: true, data: reservations.map(withDisplayStatus) });
  } catch (error) {
    console.error('Calendar error:', error);
    return res.status(500).json({ success: false, message: 'Takvim verisi yüklenirken hata oluştu.' });
  }
};

const getCapacity = async (req, res) => {
  try {
    const { date, camp_center_id } = req.query;

    const campCenters = await CampCenter.findAll({ where: { is_active: true } });
    const capacityData = [];

    for (const center of campCenters) {
      if (camp_center_id && center.id !== parseInt(camp_center_id)) continue;

      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const approvedReservations = await Reservation.findAll({
        where: {
          camp_center_id: center.id,
          status: 'APPROVED',
          start_datetime: { [Op.lte]: endOfDay },
          end_datetime: { [Op.gte]: startOfDay }
        }
      });

      const pendingReservations = await Reservation.findAll({
        where: {
          camp_center_id: center.id,
          status: { [Op.in]: IN_REVIEW_STATUSES },
          start_datetime: { [Op.lte]: endOfDay },
          end_datetime: { [Op.gte]: startOfDay }
        }
      });

      const usedCapacity = approvedReservations.reduce((sum, r) => sum + r.participant_count, 0);
      const pendingCapacity = pendingReservations.reduce((sum, r) => sum + r.participant_count, 0);
      const remainingCapacity = center.capacity - usedCapacity;
      const usagePercent = Math.round((usedCapacity / center.capacity) * 100);

      capacityData.push({
        camp_center: { id: center.id, name: center.name, city: center.city },
        total_capacity: center.capacity,
        used_capacity: usedCapacity,
        pending_capacity: pendingCapacity,
        remaining_capacity: remainingCapacity,
        usage_percent: usagePercent,
        approved_reservations: approvedReservations.length,
        pending_reservations: pendingReservations.length
      });
    }

    return res.json({ success: true, data: capacityData });
  } catch (error) {
    console.error('Capacity error:', error);
    return res.status(500).json({ success: false, message: 'Kapasite verisi yüklenirken hata oluştu.' });
  }
};

module.exports = { getCalendar, getCapacity };
