const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const {
  Reservation, CampCenter, ParticipantFile, Participant,
  CommitmentDocument, ReservationMeal, ParentalConsentDocument
} = require('../models');
const { needsParentalConsent, isDocumentsComplete } = require('../utils/reservationStatus');

// 18 yaş altı gruplarda (ilkokul / ortaokul / lise veya "diğer" + 18 yaş altı var)
// katılımcı listesinde her satır için veli telefonu zorunludur. Üniversite ve
// yetişkin gruplarda istenmez. Katılımcının kendi telefonu her zaman isteğe bağlıdır.
const isGuardianPhoneRequired = (reservation) =>
  ['ilkokul', 'ortaokul', 'lise'].includes(reservation.education_level) || !!reservation.requires_parental_consent;

// Belge linki yalnızca onaylı rezervasyonda ve süresi dolmamışsa geçerlidir.
const activeTokenWhere = (token) => ({
  document_upload_token: token,
  status: 'APPROVED',
  [Op.or]: [{ token_expires_at: null }, { token_expires_at: { [Op.gt]: new Date() } }]
});

// Kamp merkezi onayladığı belge başvuran tarafından değiştirilemez (merkez
// "düzenlemeye aç" diyene kadar). Katılımcı listesi, imzalı belgelerden biri
// onaylandıktan sonra kilitlenir.
const isParticipantListLocked = (r) => r.commitment_status === 'APPROVED' || r.consent_status === 'APPROVED';
const LOCKED_MESSAGE = 'Bu belge kamp merkezi tarafından onaylandığı için değiştirilemez. Değişiklik için kamp merkezi ile iletişime geçin.';
const { sendDocumentsCompletedAdminSms } = require('../services/smsService');
const { generateCommitmentDocxBuffer } = require('../services/commitmentDocumentService');

// Belge durumunu günceller; bu yükleme istenen belgeleri tamamladıysa kamp
// merkezi yöneticisine bildirim gönderir.
async function updateAndNotifyIfComplete(reservation, changes) {
  const wasComplete = isDocumentsComplete(reservation);
  await reservation.update(changes);
  if (wasComplete || !isDocumentsComplete(reservation)) return;
  try {
    await sendDocumentsCompletedAdminSms(reservation);
  } catch (smsError) {
    console.error('Admin bildirim SMS gönderilemedi:', smsError);
  }
}

const getByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const reservation = await Reservation.findOne({
      where: { document_upload_token: token },
      include: [
        { model: CampCenter, as: 'campCenter', attributes: ['id', 'name', 'city'] },
        { model: ParticipantFile, as: 'participantFiles', order: [['uploaded_at', 'DESC']], limit: 1 },
        { model: CommitmentDocument, as: 'commitmentDocuments', order: [['uploaded_at', 'DESC']], limit: 1 },
        {
          model: ParentalConsentDocument, as: 'consentDocuments',
          attributes: ['id', 'original_file_name', 'uploaded_at']
        }
      ],
      order: [[{ model: ParentalConsentDocument, as: 'consentDocuments' }, 'uploaded_at', 'ASC']]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Geçersiz veya süresi dolmuş bağlantı.' });
    }

    if (reservation.status !== 'APPROVED') {
      return res.status(403).json({ success: false, message: 'Bu rezervasyon henüz onaylanmamıştır.' });
    }

    if (reservation.token_expires_at && new Date() > new Date(reservation.token_expires_at)) {
      return res.status(403).json({ success: false, message: 'Bu bağlantının süresi dolmuştur. Lütfen admin ile iletişime geçin.' });
    }

    return res.json({
      success: true,
      data: {
        reservation_number: reservation.reservation_number,
        authorized_name: `${reservation.authorized_first_name} ${reservation.authorized_last_name}`,
        camp_center: reservation.campCenter,
        start_datetime: reservation.start_datetime,
        end_datetime: reservation.end_datetime,
        participant_count: reservation.participant_count,
        participant_file_status: reservation.participant_file_status,
        commitment_status: reservation.commitment_status,
        latest_participant_file: reservation.participantFiles?.[0] || null,
        latest_commitment: reservation.commitmentDocuments?.[0] || null,
        requires_parental_consent: needsParentalConsent(reservation),
        guardian_phone_required: isGuardianPhoneRequired(reservation),
        minor_participant_count: reservation.minor_participant_count,
        uploaded_participant_count: await Participant.count({ where: { reservation_id: reservation.id } }),
        participant_list_locked: isParticipantListLocked(reservation),
        commitment_locked: reservation.commitment_status === 'APPROVED',
        consent_status: reservation.consent_status,
        consent_rejection_reason: reservation.consent_status === 'REJECTED' ? reservation.consent_rejection_reason : null,
        consent_files: reservation.consentDocuments || []
      }
    });
  } catch (error) {
    console.error('getByToken error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

const PARTICIPANT_COLUMNS = [
  { header: 'Sıra No', width: 10 },
  { header: 'Adı Soyadı', width: 28 },
  { header: 'TC Kimlik Numarası', width: 20 },
  { header: 'Doğum Tarihi', width: 16 },
  { header: 'Telefon Numarası', width: 20 },
  { header: 'Veli Telefon Numarası', width: 22 }
];

const THIN_BORDER = { style: 'thin', color: { argb: 'FFB0B0B0' } };
const CELL_BORDER = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };

const downloadExcelTemplate = async (req, res) => {
  try {
    const { token } = req.params;
    const reservation = await Reservation.findOne({
      where: activeTokenWhere(token),
      include: [{ model: CampCenter, as: 'campCenter' }]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Geçersiz bağlantı.' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Katılımcı Listesi');

    sheet.columns = PARTICIPANT_COLUMNS.map(c => ({ width: c.width }));
    const headers = PARTICIPANT_COLUMNS.map(c => c.header);
    if (isGuardianPhoneRequired(reservation)) headers[5] = 'Veli Telefon Numarası (Zorunlu)';

    // Title row — which camp center this list belongs to
    const titleRow = sheet.addRow([`${reservation.campCenter?.name || ''} Katılımcı Listesi`]);
    sheet.mergeCells(titleRow.number, 1, titleRow.number, PARTICIPANT_COLUMNS.length);
    titleRow.height = 28;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };

    // Header row
    const headerRow = sheet.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FF7F1D1D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      cell.border = CELL_BORDER;
    });

    // Data rows — one per participant, generously sized for easy filling
    for (let i = 1; i <= reservation.participant_count; i++) {
      const row = sheet.addRow([i, ...Array(PARTICIPANT_COLUMNS.length - 1).fill('')]);
      row.height = 24;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = CELL_BORDER;
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
      });
      row.getCell(4).numFmt = 'dd.mm.yyyy';
    }

    const fileName = `onderkamp-katilimci-listesi-${reservation.reservation_number}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Excel template error:', error);
    return res.status(500).json({ success: false, message: 'Excel oluşturulurken hata oluştu.' });
  }
};

const downloadCommitmentTemplate = async (req, res) => {
  try {
    const { token } = req.params;
    const reservation = await Reservation.findOne({
      where: activeTokenWhere(token),
      include: [{ model: CampCenter, as: 'campCenter' }]
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Geçersiz bağlantı.' });
    }

    const buffer = generateCommitmentDocxBuffer(reservation);

    if (!buffer) {
      return res.status(404).json({ success: false, message: 'Taahhütname şablonu bulunamadı.' });
    }

    const fileName = `onderkamp-taahhutname-${reservation.reservation_number}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    return res.send(buffer);
  } catch (error) {
    console.error('downloadCommitmentTemplate error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
};

// Accepts a JS Date, an Excel serial date number, or a typed "dd.mm.yyyy" /
// "dd/mm/yyyy" / "yyyy-mm-dd" string, and normalizes it to "yyyy-mm-dd" for
// storage. Returns { value: null, error: false } for an empty cell, and
// { value: null, error: true } when something was entered but unparseable.
function parseBirthDate(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { value: null, error: false };
  }

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return { value: raw.toISOString().slice(0, 10), error: false };
  }

  if (typeof raw === 'number') {
    const parsed = xlsx.SSF.parse_date_code(raw);
    if (!parsed) return { value: null, error: true };
    const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return { value: d.toISOString().slice(0, 10), error: false };
  }

  const str = String(raw).trim();

  let m = str.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m.map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d) {
      return { value: date.toISOString().slice(0, 10), error: false };
    }
    return { value: null, error: true };
  }

  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m.map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d) {
      return { value: date.toISOString().slice(0, 10), error: false };
    }
  }

  return { value: null, error: true };
}

// "yyyy-mm-dd" doğum tarihine göre bugünkü yaş (bu yılki doğum günü geçmediyse bir eksik).
function calculateAge(birthDate) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

const uploadParticipants = async (req, res) => {
  try {
    const { token } = req.params;
    const reservation = await Reservation.findOne({
      where: activeTokenWhere(token)
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Geçersiz bağlantı.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Dosya yüklenmedi.' });
    }

    if (isParticipantListLocked(reservation)) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, message: LOCKED_MESSAGE });
    }

    // Parse Excel
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Skip the title row ("<Kamp Merkezi> Katılımcı Listesi") and the column
    // header row — actual participant rows start on row 3.
    const dataRows = rows.slice(2).filter(row => row.some(cell => cell !== undefined && cell !== ''));

    const errors = [];
    const participants = [];
    const phones = new Set();

    // Validate row count
    // Grup küçülebilir; liste rezervasyondaki kişi sayısını aşamaz
    if (dataRows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: 'Katılımcı listesi boş. Lütfen en az bir katılımcı girin.' });
    }
    if (dataRows.length > reservation.participant_count) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: `Katılımcı sayısı fazla. Rezervasyon ${reservation.participant_count} kişilik, dosyada ${dataRows.length} satır bulundu.`
      });
    }

    const guardianPhoneRequired = isGuardianPhoneRequired(reservation);

    // Validate each row
    dataRows.forEach((row, index) => {
      const rowNum = index + 3; // 1-indexed + title row + header row
      const [siraNo, adSoyad, tcNo, dogumTarihi, telefon, veliTelefon] = row;

      if (!adSoyad || String(adSoyad).trim() === '') {
        errors.push(`${rowNum}. satırda Adı Soyadı alanı boş.`);
      }

      if (tcNo !== undefined && tcNo !== '') {
        const tcStr = String(tcNo).replace(/\D/g, '');
        if (tcStr.length !== 11) {
          errors.push(`${rowNum}. satırdaki TC Kimlik Numarası geçersizdir (11 haneli olmalı).`);
        }
      }

      const { value: birthDateValue, error: birthDateError } = parseBirthDate(dogumTarihi);
      if (birthDateError) {
        errors.push(`${rowNum}. satırdaki doğum tarihi geçersizdir (gg.aa.yyyy formatında olmalı).`);
      }

      if (telefon !== undefined && telefon !== '') {
        const phoneStr = String(telefon).replace(/\D/g, '');
        if (phoneStr.length < 10) {
          errors.push(`Katılımcı listesinin ${rowNum}. satırındaki telefon numarası geçersizdir.`);
        }
        if (phones.has(phoneStr)) {
          errors.push(`${rowNum}. satırdaki telefon numarası daha önce kullanılmıştır.`);
        }
        phones.add(phoneStr);
      }

      if (veliTelefon !== undefined && String(veliTelefon).trim() !== '') {
        const guardianPhoneStr = String(veliTelefon).replace(/\D/g, '');
        if (guardianPhoneStr.length < 10) {
          errors.push(`${rowNum}. satırdaki veli telefon numarası geçersizdir.`);
        }
      } else if (birthDateValue && calculateAge(birthDateValue) < 18) {
        // Öğrenim durumundan bağımsız: 18 yaşından küçük herkes için veli telefonu zorunlu
        const name = String(adSoyad || '').trim() || `${rowNum}. satırdaki`;
        errors.push(`${name} isimli katılımcının veli telefon numarasını giriniz lütfen.`);
      } else if (guardianPhoneRequired) {
        errors.push(`${rowNum}. satırda veli telefon numarası boş (18 yaş altı gruplarda zorunludur).`);
      }

      participants.push({
        reservation_id: reservation.id,
        row_number: index + 1,
        full_name: String(adSoyad || '').trim(),
        tc_no: tcNo ? String(tcNo).replace(/\D/g, '') : null,
        birth_date: birthDateValue,
        phone: telefon ? String(telefon).trim() : null,
        guardian_phone: veliTelefon ? String(veliTelefon).trim() : null
      });
    });

    if (errors.length > 0) {
      // Delete uploaded file on validation error
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Katılımcı listesinde hatalar bulundu.',
        errors
      });
    }

    // Save file record
    const participantFile = await ParticipantFile.create({
      reservation_id: reservation.id,
      original_file_name: req.file.originalname,
      stored_file_name: req.file.filename,
      file_path: req.file.path,
      file_size: req.file.size,
      validation_status: 'VALID',
      uploaded_at: new Date()
    });

    // Delete old participants and insert new ones
    await Participant.destroy({ where: { reservation_id: reservation.id } });

    const participantsWithFileId = participants.map(p => ({
      ...p,
      participant_file_id: participantFile.id
    }));
    await Participant.bulkCreate(participantsWithFileId);

    // 18 yaş altı katılımcı varsa (öğrenim durumundan bağımsız) muvafakatname de istenir
    const minorCount = participants.filter(p => p.birth_date && calculateAge(p.birth_date) < 18).length;
    const consentWasNeeded = needsParentalConsent(reservation);
    await updateAndNotifyIfComplete(reservation, {
      participant_file_status: 'UPLOADED',
      minor_participant_count: minorCount
    });
    const consentNowNeeded = !consentWasNeeded && needsParentalConsent(reservation);

    return res.json({
      success: true,
      message: consentNowNeeded
        ? `${participants.length} katılımcı kaydedildi. Listede 18 yaşından küçük ${minorCount} katılımcı olduğu için veli muvafakatnamesi de yüklemeniz gerekmektedir.`
        : `${participants.length} katılımcı başarıyla kaydedildi.`,
      data: { participant_count: participants.length, minor_participant_count: minorCount }
    });
  } catch (error) {
    console.error('uploadParticipants error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, message: 'Dosya işlenirken hata oluştu.' });
  }
};

const uploadCommitment = async (req, res) => {
  try {
    const { token } = req.params;
    const reservation = await Reservation.findOne({
      where: activeTokenWhere(token)
    });

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Geçersiz bağlantı.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Dosya yüklenmedi.' });
    }

    if (reservation.commitment_status === 'APPROVED') {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, message: LOCKED_MESSAGE });
    }

    await CommitmentDocument.create({
      reservation_id: reservation.id,
      original_file_name: req.file.originalname,
      stored_file_name: req.file.filename,
      file_path: req.file.path,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      status: 'UPLOADED',
      uploaded_at: new Date()
    });

    await updateAndNotifyIfComplete(reservation, { commitment_status: 'UPLOADED' });

    return res.json({ success: true, message: 'Taahhütname başarıyla yüklendi.' });
  } catch (error) {
    console.error('uploadCommitment error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, message: 'Dosya yüklenirken hata oluştu.' });
  }
};

// 18 yaş altı gruplar için imzalı veli muvafakatnameleri. Her yükleme mevcut
// dosyalara eklenir; red sonrası eksikler yeniden yüklenebilir.
const uploadConsents = async (req, res) => {
  const files = req.files || [];
  const removeFiles = () => files.forEach(f => fs.unlink(f.path, () => {}));

  try {
    const { token } = req.params;
    const reservation = await Reservation.findOne({
      where: activeTokenWhere(token)
    });

    if (!reservation) {
      removeFiles();
      return res.status(404).json({ success: false, message: 'Geçersiz bağlantı.' });
    }
    if (!needsParentalConsent(reservation)) {
      removeFiles();
      return res.status(400).json({ success: false, message: 'Bu rezervasyon için veli muvafakatnamesi gerekmemektedir.' });
    }
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'Dosya yüklenmedi.' });
    }
    if (reservation.consent_status === 'APPROVED') {
      removeFiles();
      return res.status(403).json({ success: false, message: LOCKED_MESSAGE });
    }

    await ParentalConsentDocument.bulkCreate(files.map(f => ({
      reservation_id: reservation.id,
      original_file_name: Buffer.from(f.originalname, 'latin1').toString('utf8'),
      stored_file_name: f.filename,
      file_path: f.path,
      mime_type: f.mimetype,
      file_size: f.size,
      uploaded_at: new Date()
    })));

    await updateAndNotifyIfComplete(reservation, { consent_status: 'UPLOADED', consent_rejection_reason: null });

    return res.json({ success: true, message: `${files.length} muvafakatname başarıyla yüklendi.` });
  } catch (error) {
    console.error('uploadConsents error:', error);
    removeFiles();
    return res.status(500).json({ success: false, message: 'Dosyalar yüklenirken hata oluştu.' });
  }
};

module.exports = {
  getByToken,
  uploadConsents,
  downloadExcelTemplate,
  downloadCommitmentTemplate,
  uploadParticipants,
  uploadCommitment
};
