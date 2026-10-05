const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const TEMPLATES_DIR = path.join(__dirname, '../../templates/commitment');

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// The templates are the original Word files with only the value column of
// the first-page table replaced by placeholders, so the checkbox rows below
// reproduce the originals' exact wording and spacing with the chosen option
// marked.
const CHECK = ' X ';
const EMPTY = '     ';

const EDUCATION_OPTIONS = [
  { key: 'ortaokul', label: 'ORTAOKUL' },
  { key: 'lise', label: 'LİSE' },
  { key: 'universite', label: 'ÜNİVERSİTE ' },
  { key: 'mezun', label: ' MEZUN' },
  { key: 'diger', label: ' DİĞER' }
];

function formatDate(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd} / ${mm} / ${d.getFullYear()}`;
}

function formatDayAndTime(date) {
  const d = new Date(date);
  const day = DAY_NAMES[d.getDay()].toLocaleUpperCase('tr-TR');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return ` ${day} GÜNÜ       ${hh} : ${mm} SAATİ`;
}

function formatGender(groupComposition) {
  const male = groupComposition === 'male_only' || groupComposition === 'mixed';
  const female = groupComposition === 'female_only' || groupComposition === 'mixed';
  return ` ERKEK    (${male ? CHECK : EMPTY})                                    KADIN    (${female ? CHECK : EMPTY})`;
}

function formatEducation(educationLevel) {
  // İlkokul and "18 yaş altı" have no box of their own on the form, so they're marked as "Diğer".
  const selected = ['ilkokul', 'under_18'].includes(educationLevel) ? 'diger' : educationLevel;
  return EDUCATION_OPTIONS
    .map(({ key, label }) => `(${key === selected ? ' X ' : '   '})${label}`)
    .join('  ');
}

function getTemplatePath(campCenterName) {
  const name = (campCenterName || '').toLocaleLowerCase('tr-TR');
  if (name.includes('büyükçekmece')) {
    return path.join(TEMPLATES_DIR, 'taahutname-buyukcekmece.docx');
  }
  if (name.includes('bursa')) {
    return path.join(TEMPLATES_DIR, 'taahutname-bursa.docx');
  }
  return null;
}

function buildTemplateData(reservation) {
  const authorizedName = `${reservation.authorized_first_name} ${reservation.authorized_last_name}`.trim();
  const contactPerson = reservation.authorized_role
    ? `${authorizedName} (${reservation.authorized_role})`
    : authorizedName;

  return {
    kurum_adi: reservation.institution_name || '',
    tarih_araligi: ` ${formatDate(reservation.start_datetime)}  -  ${formatDate(reservation.end_datetime)}`,
    giris_gunu_saati: formatDayAndTime(reservation.start_datetime),
    cikis_gunu_saati: formatDayAndTime(reservation.end_datetime),
    cinsiyet: formatGender(reservation.group_composition),
    ogrenim_duzeyi: formatEducation(reservation.education_level),
    kisi_sayisi: String(reservation.participant_count ?? ''),
    irtibat_kisi: contactPerson,
    sehir: reservation.province || '',
    ilce: reservation.district || '',
    irtibat_cep_tel: reservation.phone || '',
    irtibat_email: reservation.email || ''
  };
}

function generateCommitmentDocxBuffer(reservation) {
  const campCenterName = reservation.campCenter?.name;
  const templatePath = getTemplatePath(campCenterName);

  if (!templatePath || !fs.existsSync(templatePath)) {
    return null;
  }

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  doc.render(buildTemplateData(reservation));

  return doc.getZip().generate({ type: 'nodebuffer' });
}

module.exports = { generateCommitmentDocxBuffer };
