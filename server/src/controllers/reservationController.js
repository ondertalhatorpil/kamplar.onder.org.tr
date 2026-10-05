const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const {
  Reservation, CampCenter, ReservationMeal, ReservationStatusLog, Admin,
  ParticipantFile, CommitmentDocument
} = require('../models');
const { generateReservationNumber, calculateDaysAndNights, requiresParentalConsent, isValidMobilePhone } = require('../utils/helpers');
const { sendReservationReceivedSms, sendNewReservationAdminSms } = require('../services/smsService');

const { withDisplayStatus, displayStatusWhere } = require('../utils/reservationStatus');
const { reservationScope } = require('../utils/roles');

// Multipart isteklerde form verisi `payload` alanında JSON olarak gelir.
const parseCreateBody = (req) => {
  if (typeof req.body.payload !== 'string') return req.body;
  try {
    return JSON.parse(req.body.payload);
  } catch {
    return {};
  }
};

const create = async (req, res) => {
  // Talep oluşturulamazsa yüklenen program dosyası diskte sahipsiz kalmasın
  let programFileSaved = false;
  res.on('finish', () => {
    if (req.file && !programFileSaved) fs.unlink(req.file.path, () => {});
  });

  try {
    const {
      authorized_first_name, authorized_last_name, authorized_role,
      phone, email, institution_name, province, district,
      group_composition, group_nature, education_level, participant_count, purpose, purpose_detail,
      camp_center_id, start_datetime, end_datetime, meals, description, has_minors
    } = parseCreateBody(req);

    // Validate required fields
    const requiredFields = {
      authorized_first_name, authorized_last_name, authorized_role,
      phone, email, institution_name, province, district,
      group_composition, education_level, purpose,
      camp_center_id, start_datetime, end_datetime
    };
    const missingField = Object.entries(requiredFields).find(([, value]) => value === undefined || value === null || value === '');
    if (missingField) {
      return res.status(400).json({ success: false, message: 'Lütfen tüm zorunlu alanları doldurun.' });
    }
    if (!isValidMobilePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX). Bilgilendirmeler bu numaraya SMS ile gönderilir.' });
    }
    if (!['mixed', 'female_only', 'male_only'].includes(group_composition)) {
      return res.status(400).json({ success: false, message: 'Geçersiz grup kompozisyonu.' });
    }
    if (!['ilkokul', 'ortaokul', 'lise', 'universite', 'diger'].includes(education_level)) {
      return res.status(400).json({ success: false, message: 'Geçersiz öğrenim durumu.' });
    }

    // Legacy binary gender field, derived from group_composition for backward-compatible filtering/analytics
    const group_gender = { female_only: 'kiz', male_only: 'erkek' }[group_composition] || null;

    // Validate camp center
    const campCenter = await CampCenter.findOne({ where: { id: camp_center_id, is_active: true } });
    if (!campCenter) {
      return res.status(400).json({ success: false, message: 'Geçersiz kamp merkezi seçimi.' });
    }

    // Validate participant count
    if (participant_count < 10) {
      return res.status(400).json({ success: false, message: 'Minimum katılımcı sayısı 10 olmalıdır.' });
    }
    if (participant_count > campCenter.capacity) {
      return res.status(400).json({
        success: false,
        message: `${campCenter.name} için maksimum katılımcı sayısı ${campCenter.capacity} kişidir.`
      });
    }

    // Validate dates
    const startDate = new Date(start_datetime);
    const endDate = new Date(end_datetime);
    const now = new Date();

    if (startDate < now) {
      return res.status(400).json({ success: false, message: 'Geçmiş tarih seçilemez.' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ success: false, message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.' });
    }

    // Generate reservation number
    const reservation_number = await generateReservationNumber();
    const { total_days, total_nights } = calculateDaysAndNights(start_datetime, end_datetime);

    // Create reservation
    const reservation = await Reservation.create({
      reservation_number,
      authorized_first_name,
      authorized_last_name,
      authorized_role,
      phone,
      email,
      institution_name,
      province,
      district,
      group_gender,
      group_composition,
      group_nature,
      education_level,
      requires_parental_consent: requiresParentalConsent(education_level, has_minors),
      participant_count,
      purpose,
      purpose_detail,
      camp_center_id,
      start_datetime,
      end_datetime,
      total_days,
      total_nights,
      description,
      status: 'PENDING',
      ...(req.file && {
        program_file_name: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
        program_file_path: req.file.path,
        program_file_mime: req.file.mimetype,
        program_file_size: req.file.size
      })
    });
    programFileSaved = true;

    // Create meals
    if (meals && Array.isArray(meals) && meals.length > 0) {
      const mealRecords = meals.map(meal => ({
        reservation_id: reservation.id,
        meal_date: meal.meal_date,
        breakfast_selected: meal.breakfast_selected || false,
        dinner_selected: campCenter.has_dinner ? (meal.dinner_selected || false) : false
      }));
      await ReservationMeal.bulkCreate(mealRecords);
    }

    // Log status
    await ReservationStatusLog.create({
      reservation_id: reservation.id,
      old_status: null,
      new_status: 'PENDING',
      description: 'Rezervasyon talebi oluşturuldu.'
    });

    // Send SMS
    try {
      await sendReservationReceivedSms(reservation);
    } catch (smsError) {
      console.error('SMS gönderilemedi:', smsError);
    }

    try {
      await sendNewReservationAdminSms(reservation);
    } catch (smsError) {
      console.error('Admin bildirim SMS gönderilemedi:', smsError);
    }

    return res.status(201).json({
      success: true,
      message: 'Rezervasyon talebiniz alınmıştır. Tarih ve kapasite uygunluğu incelendikten sonra SMS ile bilgilendirileceksiniz.',
      data: {
        reservation_number: reservation.reservation_number,
        id: reservation.id
      }
    });
  } catch (error) {
    console.error('Reservation create error:', error);
    return res.status(500).json({ success: false, message: 'Rezervasyon oluşturulurken hata oluştu.' });
  }
};

// Admin: Get all reservations with filters
const adminGetAll = async (req, res) => {
  try {
    const {
      status, camp_center_id, group_gender, start_date, end_date,
      search, ids, page = 1, limit = 10
    } = req.query;

    const where = {};
    if (status && status !== 'all') where[Op.and] = [displayStatusWhere(status)];
    if (camp_center_id) where.camp_center_id = camp_center_id;
    // SMS linkinden gelen seçili talepler (ör. ?ids=12,13)
    if (ids) {
      const idList = String(ids).split(',').map(id => parseInt(id)).filter(Boolean);
      where.id = { [Op.in]: idList };
    }
    Object.assign(where, reservationScope(req.admin));
    if (group_gender) where.group_gender = group_gender;
    if (start_date) where.start_datetime = { [Op.gte]: new Date(start_date) };
    if (end_date) {
      where.end_datetime = where.end_datetime || {};
      where.end_datetime[Op.lte] = new Date(end_date + 'T23:59:59');
    }
    if (search) {
      where[Op.or] = [
        { reservation_number: { [Op.like]: `%${search}%` } },
        { authorized_first_name: { [Op.like]: `%${search}%` } },
        { authorized_last_name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Reservation.findAndCountAll({
      where,
      include: [
        { model: CampCenter, as: 'campCenter', attributes: ['id', 'name', 'city'] },
        { model: Admin, as: 'forwardedByAdmin', attributes: ['id', 'first_name', 'last_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    return res.json({
      success: true,
      data: rows.map(withDisplayStatus),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin getAll reservations error:', error);
    return res.status(500).json({ success: false, message: 'Rezervasyonlar yüklenirken hata oluştu.' });
  }
};

const adminGetById = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: { id: req.params.id, ...reservationScope(req.admin) },
      include: [
        { model: CampCenter, as: 'campCenter' },
        { model: ReservationMeal, as: 'meals', order: [['meal_date', 'ASC']] },
        { model: Admin, as: 'reviewedByAdmin', attributes: ['id', 'first_name', 'last_name', 'role'] },
        { model: Admin, as: 'forwardedByAdmin', attributes: ['id', 'first_name', 'last_name'] },
        { model: Admin, as: 'hqReviewedByAdmin', attributes: ['id', 'first_name', 'last_name'] },
        { model: ReservationStatusLog, as: 'statusLogs', order: [['created_at', 'DESC']] },
        { model: ParticipantFile, as: 'participantFiles', limit: 1, order: [['uploaded_at', 'DESC']] },
        { model: CommitmentDocument, as: 'commitmentDocuments', limit: 1, order: [['uploaded_at', 'DESC']] }
      ]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    }

    return res.json({ success: true, data: withDisplayStatus(reservation) });
  } catch (error) {
    console.error('Admin getById error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

// Admin: Manually record a reservation in one shot — used to backfill past
// bookings (so historical data is included in analytics) or to add future
// ones outside the public flow. Saved straight to APPROVED, no SMS, no
// document-upload step, and no capacity/date-window checks (deliberately
// looser than the public flow since this is an admin data-entry tool).
const adminCreate = async (req, res) => {
  try {
    const {
      authorized_first_name, authorized_last_name, authorized_role,
      phone, email, institution_name, province, district,
      group_composition, group_nature, education_level, participant_count, purpose, purpose_detail,
      camp_center_id, start_datetime, end_datetime, meals, description, has_minors
    } = req.body;

    const requiredFields = {
      authorized_first_name, authorized_last_name, authorized_role,
      phone, email, institution_name, province, district,
      group_composition, education_level, purpose,
      camp_center_id, start_datetime, end_datetime, participant_count
    };
    const missingField = Object.entries(requiredFields).find(([, value]) => value === undefined || value === null || value === '');
    if (missingField) {
      return res.status(400).json({ success: false, message: 'Lütfen tüm zorunlu alanları doldurun.' });
    }
    if (!isValidMobilePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX). Bilgilendirmeler bu numaraya SMS ile gönderilir.' });
    }
    if (!['mixed', 'female_only', 'male_only'].includes(group_composition)) {
      return res.status(400).json({ success: false, message: 'Geçersiz grup kompozisyonu.' });
    }
    if (!['ilkokul', 'ortaokul', 'lise', 'universite', 'diger'].includes(education_level)) {
      return res.status(400).json({ success: false, message: 'Geçersiz öğrenim durumu.' });
    }
    if (parseInt(participant_count) < 1) {
      return res.status(400).json({ success: false, message: 'Katılımcı sayısı en az 1 olmalıdır.' });
    }

    const group_gender = { female_only: 'kiz', male_only: 'erkek' }[group_composition] || null;

    const campCenter = await CampCenter.findByPk(camp_center_id);
    if (!campCenter) {
      return res.status(400).json({ success: false, message: 'Geçersiz kamp merkezi seçimi.' });
    }

    const startDate = new Date(start_datetime);
    const endDate = new Date(end_datetime);
    if (endDate <= startDate) {
      return res.status(400).json({ success: false, message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.' });
    }

    const reservation_number = await generateReservationNumber();
    const { total_days, total_nights } = calculateDaysAndNights(start_datetime, end_datetime);

    const reservation = await Reservation.create({
      reservation_number,
      authorized_first_name,
      authorized_last_name,
      authorized_role,
      phone,
      email,
      institution_name,
      province,
      district,
      group_gender,
      group_composition,
      group_nature,
      education_level,
      requires_parental_consent: requiresParentalConsent(education_level, has_minors),
      participant_count,
      purpose,
      purpose_detail,
      camp_center_id,
      start_datetime,
      end_datetime,
      total_days,
      total_nights,
      description: description || '',
      status: 'APPROVED',
      reviewed_by_admin_id: req.admin.id,
      reviewed_at: new Date()
    });

    if (meals && Array.isArray(meals) && meals.length > 0) {
      const mealRecords = meals.map(meal => ({
        reservation_id: reservation.id,
        meal_date: meal.meal_date,
        breakfast_selected: campCenter.has_breakfast ? (meal.breakfast_selected || false) : false,
        dinner_selected: campCenter.has_dinner ? (meal.dinner_selected || false) : false
      }));
      await ReservationMeal.bulkCreate(mealRecords);
    }

    await ReservationStatusLog.create({
      reservation_id: reservation.id,
      old_status: null,
      new_status: 'APPROVED',
      changed_by_admin_id: req.admin.id,
      description: 'Rezervasyon admin tarafından manuel olarak kaydedildi.'
    });

    return res.status(201).json({
      success: true,
      message: 'Rezervasyon manuel olarak oluşturuldu.',
      data: { reservation_number: reservation.reservation_number, id: reservation.id }
    });
  } catch (error) {
    console.error('Admin manual create error:', error);
    return res.status(500).json({ success: false, message: 'Rezervasyon oluşturulurken hata oluştu.' });
  }
};

const downloadProgramFile = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      where: { id: req.params.id, ...reservationScope(req.admin) },
      attributes: ['id', 'program_file_name', 'program_file_path', 'program_file_mime']
    });

    if (!reservation || !reservation.program_file_path) {
      return res.status(404).json({ success: false, message: 'Program dosyası bulunamadı.' });
    }
    if (!fs.existsSync(reservation.program_file_path)) {
      return res.status(404).json({ success: false, message: 'Dosya sunucuda bulunamadı.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(reservation.program_file_name)}"`);
    res.setHeader('Content-Type', reservation.program_file_mime || 'application/octet-stream');
    return res.sendFile(path.resolve(reservation.program_file_path));
  } catch (error) {
    console.error('Program file download error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = { create, adminGetAll, adminGetById, adminCreate, downloadProgramFile };
