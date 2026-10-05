const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');
const { Reservation, CampCenter, ReservationMeal } = require('../models');
const { documentsCompleteWhere } = require('../utils/reservationStatus');

const HAS_DOCUMENT_TOKEN = { document_upload_token: { [Op.ne]: null } };

const buildDateFilter = (period, start_date, end_date) => {
  const now = new Date();
  let dateFilter = {};

  if (period === 'weekly') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = { start_datetime: { [Op.gte]: weekAgo } };
  } else if (period === 'monthly') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter = { start_datetime: { [Op.gte]: monthAgo } };
  } else if (start_date && end_date) {
    dateFilter = {
      start_datetime: { [Op.gte]: new Date(start_date) },
      end_datetime: { [Op.lte]: new Date(end_date + 'T23:59:59') }
    };
  }

  return dateFilter;
};

const getSummary = async (req, res) => {
  try {
    const { period, start_date, end_date, camp_center_id } = req.query;
    const dateFilter = buildDateFilter(period, start_date, end_date);

    const where = { status: 'APPROVED', ...dateFilter };
    if (camp_center_id) where.camp_center_id = camp_center_id;

    const [
      totalReservations,
      totalParticipants,
      girlParticipants,
      boyParticipants,
      bursaStats,
      buyukcekmece,
      avgGroupSize,
      avgDuration,
      purposeData,
      breakfastCount,
      dinnerCount,
      documentsComplete,
      documentsPending
    ] = await Promise.all([
      Reservation.count({ where }),
      Reservation.sum('participant_count', { where }),
      Reservation.sum('participant_count', { where: { ...where, group_gender: 'kiz' } }),
      Reservation.sum('participant_count', { where: { ...where, group_gender: 'erkek' } }),
      Reservation.findAll({
        where: { ...where, camp_center_id: 1 },
        attributes: [
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('participant_count')), 'total_participants']
        ],
        raw: true
      }),
      Reservation.findAll({
        where: { ...where, camp_center_id: 2 },
        attributes: [
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('participant_count')), 'total_participants']
        ],
        raw: true
      }),
      Reservation.findAll({
        where,
        attributes: [[fn('AVG', col('participant_count')), 'avg']],
        raw: true
      }),
      Reservation.findAll({
        where,
        attributes: [[fn('AVG', col('total_days')), 'avg']],
        raw: true
      }),
      Reservation.findAll({
        where,
        attributes: ['purpose', [fn('COUNT', col('id')), 'count']],
        group: ['purpose'],
        order: [[literal('count'), 'DESC']],
        raw: true
      }),
      ReservationMeal.count({ where: { breakfast_selected: true } }),
      ReservationMeal.count({ where: { dinner_selected: true } }),
      Reservation.count({ where: { [Op.and]: [where, HAS_DOCUMENT_TOKEN, documentsCompleteWhere] } }),
      Reservation.count({ where: { [Op.and]: [where, HAS_DOCUMENT_TOKEN, { [Op.not]: documentsCompleteWhere }] } })
    ]);

    const campCenters = await CampCenter.findAll({ where: { is_active: true } });
    const bursaCenter = campCenters.find(c => c.id === 1);
    const buyukCenter = campCenters.find(c => c.id === 2);

    return res.json({
      success: true,
      data: {
        total_reservations: totalReservations,
        total_participants: totalParticipants || 0,
        girl_participants: girlParticipants || 0,
        boy_participants: boyParticipants || 0,
        bursa: {
          count: parseInt(bursaStats[0]?.count || 0),
          total_participants: parseInt(bursaStats[0]?.total_participants || 0),
          capacity: bursaCenter?.capacity || 78,
          usage_percent: bursaCenter ? Math.round(((bursaStats[0]?.total_participants || 0) / bursaCenter.capacity) * 100) : 0
        },
        buyukcekmece: {
          count: parseInt(buyukcekmece[0]?.count || 0),
          total_participants: parseInt(buyukcekmece[0]?.total_participants || 0),
          capacity: buyukCenter?.capacity || 48,
          usage_percent: buyukCenter ? Math.round(((buyukcekmece[0]?.total_participants || 0) / buyukCenter.capacity) * 100) : 0
        },
        avg_group_size: parseFloat(avgGroupSize[0]?.avg || 0).toFixed(1),
        avg_duration: parseFloat(avgDuration[0]?.avg || 0).toFixed(1),
        total_breakfast: breakfastCount,
        total_dinner: dinnerCount,
        documents_complete: documentsComplete,
        documents_pending: documentsPending,
        purpose_distribution: purposeData
      }
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    return res.status(500).json({ success: false, message: 'Analiz verisi yüklenirken hata oluştu.' });
  }
};

const getTrends = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    const reservations = await Reservation.findAll({
      where: { status: 'APPROVED' },
      attributes: ['start_datetime', 'participant_count', 'camp_center_id'],
      order: [['start_datetime', 'ASC']]
    });

    // Group by month
    const monthly = {};
    reservations.forEach(r => {
      const date = new Date(r.start_datetime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { month: key, reservations: 0, participants: 0 };
      monthly[key].reservations++;
      monthly[key].participants += r.participant_count;
    });

    return res.json({ success: true, data: Object.values(monthly) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Trend verisi yüklenirken hata oluştu.' });
  }
};

const getCampCenterStats = async (req, res) => {
  try {
    const centers = await CampCenter.findAll({ where: { is_active: true } });
    const stats = [];

    for (const center of centers) {
      const reservations = await Reservation.findAll({
        where: { camp_center_id: center.id, status: 'APPROVED' },
        attributes: ['participant_count']
      });

      stats.push({
        id: center.id,
        name: center.name,
        city: center.city,
        capacity: center.capacity,
        count: reservations.length,
        total_participants: reservations.reduce((sum, r) => sum + r.participant_count, 0)
      });
    }

    return res.json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const getGenderStats = async (req, res) => {
  try {
    const genderData = await Reservation.findAll({
      where: { status: 'APPROVED' },
      attributes: ['group_gender', [fn('COUNT', col('id')), 'count'], [fn('SUM', col('participant_count')), 'participants']],
      group: ['group_gender'],
      raw: true
    });

    return res.json({ success: true, data: genderData });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const getPurposeStats = async (req, res) => {
  try {
    const data = await Reservation.findAll({
      where: { status: 'APPROVED' },
      attributes: ['purpose', [fn('COUNT', col('id')), 'count']],
      group: ['purpose'],
      order: [[literal('count'), 'DESC']],
      raw: true
    });

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const getMealStats = async (req, res) => {
  try {
    const breakfastCount = await ReservationMeal.count({ where: { breakfast_selected: true } });
    const dinnerCount = await ReservationMeal.count({ where: { dinner_selected: true } });

    return res.json({ success: true, data: { breakfast: breakfastCount, dinner: dinnerCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const getCapacityStats = async (req, res) => {
  try {
    const centers = await CampCenter.findAll({ where: { is_active: true } });
    const now = new Date();
    const data = [];

    for (const center of centers) {
      const current = await Reservation.findAll({
        where: {
          camp_center_id: center.id,
          status: 'APPROVED',
          start_datetime: { [Op.lte]: now },
          end_datetime: { [Op.gte]: now }
        }
      });

      const used = current.reduce((sum, r) => sum + r.participant_count, 0);
      data.push({
        id: center.id,
        name: center.name,
        capacity: center.capacity,
        used,
        remaining: center.capacity - used,
        percent: Math.round((used / center.capacity) * 100)
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const getDocumentStats = async (req, res) => {
  try {
    // Belge akışı yalnızca belge linki olan (manuel kayıt olmayan) rezervasyonlar için geçerli
    const total = await Reservation.count({ where: { status: 'APPROVED', ...HAS_DOCUMENT_TOKEN } });
    const complete = await Reservation.count({
      where: { [Op.and]: [{ status: 'APPROVED' }, HAS_DOCUMENT_TOKEN, documentsCompleteWhere] }
    });

    return res.json({ success: true, data: { total, complete, incomplete: total - complete } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = {
  getSummary, getTrends, getCampCenterStats,
  getGenderStats, getPurposeStats, getMealStats,
  getCapacityStats, getDocumentStats
};
