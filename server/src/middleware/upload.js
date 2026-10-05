const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const PARTICIPANT_FILE_MAX_SIZE = parseInt(process.env.PARTICIPANT_FILE_MAX_SIZE) || 5242880;
const COMMITMENT_FILE_MAX_SIZE = parseInt(process.env.COMMITMENT_FILE_MAX_SIZE) || 10485760;
const PROGRAM_FILE_MAX_SIZE = parseInt(process.env.PROGRAM_FILE_MAX_SIZE) || 10485760;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const participantStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/participant-files');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const commitmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/commitment-documents');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const consentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/parental-consents');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const programStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/program-files');
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const participantFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  const allowedExts = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Geçersiz dosya türü. Yalnızca .xlsx ve .xls dosyaları kabul edilir.'), false);
  }
};

const commitmentFileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Geçersiz dosya türü. Yalnızca PDF, JPG ve PNG dosyaları kabul edilir.'), false);
  }
};

// Program akışı: Word, PDF, Excel, PowerPoint, metin ve görsel dosyaları
const programFileFilter = (req, file, cb) => {
  const allowedExts = [
    '.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt',
    '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png'
  ];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Geçersiz dosya türü. Word, PDF, Excel, PowerPoint veya görsel dosyası yükleyebilirsiniz.'), false);
  }
};

const uploadParticipantFile = multer({
  storage: participantStorage,
  fileFilter: participantFileFilter,
  limits: { fileSize: PARTICIPANT_FILE_MAX_SIZE }
}).single('participantFile');

const uploadCommitmentFile = multer({
  storage: commitmentStorage,
  fileFilter: commitmentFileFilter,
  limits: { fileSize: COMMITMENT_FILE_MAX_SIZE }
}).single('commitmentFile');

const uploadProgramFile = multer({
  storage: programStorage,
  fileFilter: programFileFilter,
  limits: { fileSize: PROGRAM_FILE_MAX_SIZE }
}).single('programFile');

// Veli muvafakatnameleri: uzantı mutlaka PDF / görsel olmalı
const consentFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Geçersiz dosya türü. Yalnızca PDF, JPG ve PNG dosyaları kabul edilir.'), false);
  }
};

// Tek seferde en fazla 100 dosya
const uploadConsentFiles = multer({
  storage: consentStorage,
  fileFilter: consentFileFilter,
  limits: { fileSize: COMMITMENT_FILE_MAX_SIZE, files: 100 }
}).array('consentFiles', 100);

module.exports = { uploadParticipantFile, uploadCommitmentFile, uploadProgramFile, uploadConsentFiles };
