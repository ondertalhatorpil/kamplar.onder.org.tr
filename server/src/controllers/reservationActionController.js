const { Op } = require('sequelize');
const {
  sequelize, Reservation, CampCenter, ReservationStatusLog
} = require('../models');
const {
  generateDocumentToken,
  getTokenExpiryDate
} = require('../utils/helpers');
const {
  sendReservationApprovedSms,
  sendForwardedToHqSms,
  sendCenterRejectedToHqSms,
  sendHqApprovedToCenterSms,
  sendHqRejectedToCenterSms,
  sendReservationDeclinedSms,
  sendReservationCancelledSms
} = require('../services/smsService');
const { isHQ, canAccessReservation, reservationScope } = require('../utils/roles');
const { IN_REVIEW_STATUSES } = require('../utils/reservationStatus');

const checkCapacity = async (campCenterId, startDatetime, endDatetime, excludeReservationId = null) => {
  const where = {
    camp_center_id: campCenterId,
    status: 'APPROVED',
    [Op.and]: [
      { start_datetime: { [Op.lt]: new Date(endDatetime) } },
      { end_datetime: { [Op.gt]: new Date(startDatetime) } }
    ]
  };

  if (excludeReservationId) {
    where.id = { [Op.ne]: excludeReservationId };
  }

  const overlapping = await Reservation.findAll({
    where,
    attributes: [
      'id', 'reservation_number', 'group_gender', 'group_composition',
      'participant_count', 'start_datetime', 'end_datetime'
    ]
  });
  const usedCapacity = overlapping.reduce((sum, r) => sum + r.participant_count, 0);

  return { usedCapacity, overlapping };
};

// SMS hatası işlemi geri almaz; yalnızca loglanır.
const trySms = async (label, fn) => {
  try {
    await fn();
  } catch (smsError) {
    console.error(`${label} SMS gönderilemedi:`, smsError);
  }
};

const findAccessibleReservation = async (req) => {
  const reservation = await Reservation.findByPk(req.params.id, {
    include: [{ model: CampCenter, as: 'campCenter' }]
  });
  return canAccessReservation(req.admin, reservation) ? reservation : null;
};

const ensureCapacity = async (reservation) => {
  const { usedCapacity } = await checkCapacity(
    reservation.camp_center_id,
    reservation.start_datetime,
    reservation.end_datetime,
    reservation.id
  );
  const remainingCapacity = reservation.campCenter.capacity - usedCapacity;
  if (reservation.participant_count > remainingCapacity) {
    return `Kapasite yetersiz. Kalan kapasite: ${remainingCapacity} kişi, Talep edilen: ${reservation.participant_count} kişi.`;
  }
  return null;
};

// Durumu yalnızca kayıt hâlâ beklenen durumdaysa değiştirir. İki admin aynı
// talebe aynı anda işlem yaparsa ikincisi false alır (çift onay / çift SMS olmaz).
const transition = async (reservation, fromStatuses, changes, adminId, description, transaction) => {
  const [count] = await Reservation.update(changes, {
    where: { id: reservation.id, status: { [Op.in]: fromStatuses } },
    transaction
  });
  if (count === 0) return false;

  const oldStatus = reservation.status;
  Object.assign(reservation.dataValues, changes);
  await ReservationStatusLog.create({
    reservation_id: reservation.id,
    old_status: oldStatus,
    new_status: changes.status,
    changed_by_admin_id: adminId,
    description
  }, { transaction });
  return true;
};

const STALE_MESSAGE = 'Bu talep bu sırada başka bir admin tarafından işlem gördü. Sayfayı yenileyin.';

// Bekleyen talepleri (her biri için isteğe bağlı kısa notla) genel merkeze
// yönlendirir. Kamp merkezi yöneticisi kendi talepleri için yapar; genel merkez
// merkez yöneticisine ulaşılamadığında "merkez adına" yapabilir.
// Body: { items: [{ id, note }] }
const forward = async (req, res) => {
  try {
    const hq = isHQ(req.admin);
    if (!hq && !req.admin.camp_center_id) {
      return res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok.' });
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const ids = [...new Set(items.map(i => parseInt(i.id)).filter(Boolean))];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Yönlendirmek için en az bir talep seçin.' });
    }

    const notes = new Map(items.map(i => [parseInt(i.id), String(i.note || '').trim().slice(0, 300)]));

    const reservations = await Reservation.findAll({
      where: { id: { [Op.in]: ids }, status: 'PENDING', ...reservationScope(req.admin) },
      include: [{ model: CampCenter, as: 'campCenter' }],
      order: [['start_datetime', 'ASC']]
    });
    if (reservations.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen taleplerden bazıları bulunamadı veya artık beklemede değil. Sayfayı yenileyip tekrar deneyin.'
      });
    }

    const now = new Date();
    try {
      await sequelize.transaction(async (transaction) => {
        for (const reservation of reservations) {
          const note = notes.get(reservation.id) || null;
          const description = [
            hq ? 'Genel merkez tarafından merkez adına yönlendirildi.' : 'Genel merkeze yönlendirildi.',
            note && `Not: ${note}`
          ].filter(Boolean).join(' ');
          const ok = await transition(reservation, ['PENDING'], {
            status: 'FORWARDED',
            center_note: note,
            forwarded_by_admin_id: req.admin.id,
            forwarded_at: now
          }, req.admin.id, description, transaction);
          if (!ok) throw new Error('STALE');
        }
      });
    } catch (error) {
      if (error.message === 'STALE') return res.status(409).json({ success: false, message: STALE_MESSAGE });
      throw error;
    }

    // Genel merkez kendisi yönlendirdiyse kendine SMS gönderilmez
    if (!hq) {
      await trySms('Yönlendirme', () => sendForwardedToHqSms(reservations, reservations[0].campCenter.name));
    }

    return res.json({
      success: true,
      message: hq
        ? `${reservations.length} talep merkez adına yönlendirildi. Onay Bekleyenler listesinden onaylayabilirsiniz.`
        : `${reservations.length} talep genel merkeze yönlendirildi ve genel merkeze SMS gönderildi.`
    });
  } catch (error) {
    console.error('Forward error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

// FORWARDED → HQ_APPROVED: genel merkez onayı (kamp merkezine SMS)
// HQ_APPROVED → APPROVED: kamp merkezinin son onayı — genel merkez de merkez
// yöneticisine ulaşılamadığında merkez adına verebilir (başvurana belge linkli SMS)
const approve = async (req, res) => {
  try {
    const reservation = await findAccessibleReservation(req);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    }

    const hq = isHQ(req.admin);
    const isHqApproval = hq && reservation.status === 'FORWARDED';
    const isFinalApproval = reservation.status === 'HQ_APPROVED';
    if (!isHqApproval && !isFinalApproval) {
      return res.status(400).json({
        success: false,
        message: hq
          ? 'Bu talep şu anda onaylanamaz.'
          : 'Yalnızca genel merkez tarafından onaylanmış talepler için son onay verilebilir.'
      });
    }

    const capacityError = await ensureCapacity(reservation);
    if (capacityError) {
      return res.status(400).json({ success: false, message: capacityError });
    }

    if (isHqApproval) {
      const ok = await transition(reservation, ['FORWARDED'], {
        status: 'HQ_APPROVED',
        hq_reviewed_by_admin_id: req.admin.id,
        hq_reviewed_at: new Date()
      }, req.admin.id, 'Genel merkez tarafından onaylandı.');
      if (!ok) return res.status(409).json({ success: false, message: STALE_MESSAGE });

      await trySms('Genel merkez onay', () => sendHqApprovedToCenterSms(reservation, req.admin));

      return res.json({
        success: true,
        message: 'Talep onaylandı. Son onay için kamp merkezi yöneticisine SMS gönderildi.',
        data: { reservation_number: reservation.reservation_number }
      });
    }

    const documentToken = generateDocumentToken();
    const ok = await transition(reservation, ['HQ_APPROVED'], {
      status: 'APPROVED',
      document_upload_token: documentToken,
      token_expires_at: getTokenExpiryDate(reservation.end_datetime),
      reviewed_by_admin_id: req.admin.id,
      reviewed_at: new Date()
    }, req.admin.id, hq ? 'Son onay genel merkez tarafından merkez adına verildi.' : 'Kamp merkezi son onayı verildi.');
    if (!ok) return res.status(409).json({ success: false, message: STALE_MESSAGE });

    await trySms('Onay', () => sendReservationApprovedSms(reservation, documentToken));

    return res.json({
      success: true,
      message: 'Rezervasyon onaylandı ve başvuru sahibine belge linkiyle SMS gönderildi.',
      data: { reservation_number: reservation.reservation_number }
    });
  } catch (error) {
    console.error('Approve error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

// Red kesin karardır. Kamp merkezi reddi genel merkeze, genel merkez reddi kamp
// merkezine red nedeniyle SMS'le bildirilir; başvurana ise nedeni belirtilmeden
// "talebiniz uygun bulunmamıştır" SMS'i gider.
const reject = async (req, res) => {
  try {
    const rejection_reason = String(req.body.rejection_reason || '').trim();
    if (rejection_reason.length < 10) {
      return res.status(400).json({ success: false, message: 'Red nedeni en az 10 karakter olmalıdır.' });
    }

    const reservation = await findAccessibleReservation(req);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    }

    const hq = isHQ(req.admin);
    const allowedStatuses = hq ? ['PENDING', 'FORWARDED', 'HQ_APPROVED'] : ['PENDING', 'HQ_APPROVED'];
    if (!allowedStatuses.includes(reservation.status)) {
      return res.status(400).json({ success: false, message: 'Bu talep şu anda reddedilemez.' });
    }

    const ok = await transition(reservation, allowedStatuses, {
      status: 'REJECTED',
      rejection_reason,
      rejection_stage: hq ? 'HQ' : 'CENTER',
      reviewed_by_admin_id: req.admin.id,
      reviewed_at: new Date()
    }, req.admin.id, `${hq ? 'Genel merkez' : 'Kamp merkezi'} tarafından reddedildi. Neden: ${rejection_reason}`);
    if (!ok) return res.status(409).json({ success: false, message: STALE_MESSAGE });

    if (hq) {
      await trySms('Genel merkez red', () => sendHqRejectedToCenterSms(reservation, rejection_reason, req.admin));
    } else {
      await trySms('Merkez red', () =>
        sendCenterRejectedToHqSms(reservation, reservation.campCenter.name, rejection_reason, req.admin));
    }
    await trySms('Başvuran red', () => sendReservationDeclinedSms(reservation));

    return res.json({
      success: true,
      message: hq
        ? 'Talep reddedildi. Kamp merkezine ve başvuru sahibine SMS gönderildi.'
        : 'Talep reddedildi. Genel merkeze ve başvuru sahibine SMS gönderildi.'
    });
  } catch (error) {
    console.error('Reject error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

// Genel merkez: sonuçlanmamış veya onaylı bir rezervasyonu iptal eder; başvurana SMS gider.
const CANCELLABLE_STATUSES = ['PENDING', 'FORWARDED', 'HQ_APPROVED', 'APPROVED'];

const cancel = async (req, res) => {
  try {
    const reservation = await Reservation.findByPk(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    }
    if (!CANCELLABLE_STATUSES.includes(reservation.status) || new Date(reservation.end_datetime) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Bu rezervasyon iptal edilemez.' });
    }

    const reason = String(req.body?.reason || '').trim();
    const ok = await transition(reservation, CANCELLABLE_STATUSES, {
      status: 'CANCELLED',
      reviewed_by_admin_id: req.admin.id,
      reviewed_at: new Date()
    }, req.admin.id, reason ? `Rezervasyon iptal edildi. Neden: ${reason}` : 'Rezervasyon iptal edildi.');
    if (!ok) return res.status(409).json({ success: false, message: STALE_MESSAGE });

    await trySms('İptal', () => sendReservationCancelledSms(reservation));

    return res.json({ success: true, message: 'Rezervasyon iptal edildi ve başvuru sahibine SMS gönderildi.' });
  } catch (error) {
    console.error('Cancel error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const capacityCheck = async (req, res) => {
  try {
    const reservation = await findAccessibleReservation(req);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
    }

    const { usedCapacity, overlapping: approvedOverlapping } = await checkCapacity(
      reservation.camp_center_id,
      reservation.start_datetime,
      reservation.end_datetime,
      reservation.id
    );

    const campCenter = reservation.campCenter;
    const remainingCapacity = campCenter.capacity - usedCapacity;
    const canApprove = reservation.participant_count <= remainingCapacity;

    // Flag when an already-approved overlapping stay is a different gender
    // group at the same center — a heads-up independent of raw capacity math.
    const hasGenderConflict = approvedOverlapping.some(
      r => r.group_gender && reservation.group_gender && r.group_gender !== reservation.group_gender
    );

    // Also get in-review reservations that overlap (for admin awareness)
    const pendingOverlapping = await Reservation.findAll({
      where: {
        camp_center_id: reservation.camp_center_id,
        status: { [Op.in]: IN_REVIEW_STATUSES },
        id: { [Op.ne]: reservation.id },
        [Op.and]: [
          { start_datetime: { [Op.lt]: new Date(reservation.end_datetime) } },
          { end_datetime: { [Op.gt]: new Date(reservation.start_datetime) } }
        ]
      },
      attributes: ['id', 'reservation_number', 'status', 'participant_count', 'start_datetime', 'end_datetime']
    });

    const potentialUsage = pendingOverlapping.reduce((sum, r) => sum + r.participant_count, 0);
    // Genel merkez onaylı, son onay bekleyen talepler henüz kapasiteden düşmez;
    // bu talep ile birlikte kapasiteyi aşıyorlarsa ikisinden biri son onayda takılır.
    const hqApprovedUsage = pendingOverlapping
      .filter(r => r.status === 'HQ_APPROVED')
      .reduce((sum, r) => sum + r.participant_count, 0);

    return res.json({
      success: true,
      data: {
        camp_center: { name: campCenter.name, total_capacity: campCenter.capacity },
        used_capacity: usedCapacity,
        remaining_capacity: remainingCapacity,
        requested_count: reservation.participant_count,
        can_approve: canApprove,
        pending_overlapping: pendingOverlapping,
        potential_additional_usage: potentialUsage,
        hq_approved_usage: hqApprovedUsage,
        exceeds_with_hq_approved: canApprove && reservation.participant_count > remainingCapacity - hqApprovedUsage,
        approved_overlapping: approvedOverlapping,
        has_gender_conflict: hasGenderConflict
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

module.exports = { forward, approve, reject, cancel, capacityCheck };
