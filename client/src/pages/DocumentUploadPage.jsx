import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Upload, CheckCircle, XCircle, FileText, Users, AlertCircle, Clock, Send, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { documentsAPI } from '../api';
import { formatDateTime } from '../utils/helpers';
import LoadingSpinner from '../components/common/LoadingSpinner';

function FileUploadArea({ accept, label, onFile, uploading, status, statusLabel, error }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    onFile(file);
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver ? 'border-primary-500 bg-primary-50'
          : status === 'done' ? 'border-green-400 bg-green-50'
          : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        {status === 'done' ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle size={32} className="text-green-500" />
            <p className="text-green-700 font-medium">{statusLabel || 'Yüklendi'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={28} className="text-gray-400" />
            {selectedFile ? (
              <p className="text-sm text-gray-700 font-medium">{selectedFile.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">veya buraya sürükleyin</p>
              </>
            )}
            <p className="text-xs text-gray-400">Kabul edilen: {accept}</p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-2 p-3 bg-red-50 rounded-lg">
          {Array.isArray(error)
            ? error.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)
            : <p className="text-xs text-red-600">{error}</p>
          }
        </div>
      )}
      {uploading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-primary-600">
          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Yükleniyor...
        </div>
      )}
    </div>
  );
}

// client/public/taahutnameler altındaki merkeze özel boş muvafakatname şablonları
const getConsentTemplateUrl = (campCenterName = '') => {
  const name = campCenterName.toLocaleLowerCase('tr-TR');
  const file = name.includes('bursa') ? 'veli-muvafakatname-bursa.docx' : 'veli-muvafakatname-buyukcekmece.docx';
  return `/taahutnameler/${file}`;
};

const CONSENT_STATUS = {
  NOT_UPLOADED: { text: 'Muvafakatname Bekleniyor', className: 'bg-orange-50 text-orange-700', icon: Clock },
  UPLOADED: { text: 'Muvafakatname İncelemede', className: 'bg-green-50 text-green-700', icon: CheckCircle },
  APPROVED: { text: 'Muvafakatname Onaylandı', className: 'bg-green-50 text-green-700', icon: CheckCircle },
  REJECTED: { text: 'Muvafakatname Reddedildi', className: 'bg-red-50 text-red-700', icon: XCircle },
};

// 18 yaş altı gruplar: her katılımcı için veli tarafından imzalanmış muvafakatname.
// Dosyalar parça parça yüklenebilir; her gönderim mevcut dosyalara eklenir.
function ConsentCard({ token, reservation, onUploaded }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const status = reservation.consent_status;

  const addFiles = (list) => {
    setError(null);
    setFiles(prev => [...prev, ...Array.from(list || [])]);
  };

  const handleSend = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('consentFiles', f));
      const r = await documentsAPI.uploadConsents(token, fd);
      toast.success(r.data.message);
      setFiles([]);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.message || 'Dosyalar gönderilemedi.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary-600" /> Veli Muvafakatnamesi
        </h3>
        <a
          href={getConsentTemplateUrl(reservation.camp_center?.name)}
          className="btn-fill flex items-center gap-1.5 text-sm text-primary-600 hover:text-white font-medium bg-primary-50 px-4 py-1.5 rounded-full transition-colors duration-300"
          download
        >
          <Download size={14} /> Muvafakatnameyi İndir
        </a>
      </div>

      <div className="bg-red-50 rounded-lg p-4 mb-4 text-sm text-red-800">
        {reservation.minor_participant_count > 0 && (
          <p className="font-medium mb-2">Katılımcı listenizde 18 yaşından küçük {reservation.minor_participant_count} kişi var; her biri için muvafakatname gereklidir.</p>
        )}
        <p className="font-medium mb-1">Nasıl yapılır?</p>
        <ol className="list-decimal list-inside space-y-1 text-red-700">
          <li>Muvafakatname formunu indirin ve her katılımcı için ayrı çıktı alın</li>
          <li>Formu her katılımcının velisi doldurup ıslak imza ile imzalasın</li>
          <li>İmzalı formları tarayın veya net fotoğraflarını çekin</li>
          <li>PDF, JPG, JPEG veya PNG olarak yükleyin (birden fazla dosya seçebilirsiniz)</li>
        </ol>
      </div>

      {status === 'REJECTED' && reservation.consent_rejection_reason && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <p className="font-medium">Muvafakatnameler uygun bulunmadı</p>
          <p className="mt-0.5">{reservation.consent_rejection_reason}</p>
          <p className="mt-1 text-xs">Eksik veya hatalı muvafakatnameleri aşağıdan yeniden yükleyin.</p>
        </div>
      )}

      {reservation.consent_files?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Yüklenen dosyalar ({reservation.consent_files.length})</p>
          <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {reservation.consent_files.map(f => (
              <li key={f.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate text-gray-700">{f.original_file_name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatDateTime(f.uploaded_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'APPROVED' ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
          <CheckCircle size={20} className="text-green-500" />
          <p className="text-sm font-medium text-green-800">Veli muvafakatnameleri onaylandı</p>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          />
          <div
            className="border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl p-6 text-center cursor-pointer transition-all"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload size={28} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                {status === 'UPLOADED' ? 'Eksik muvafakatname varsa ekleyin' : 'İmzalı muvafakatnameleri seçin'}
              </p>
              <p className="text-xs text-gray-400">veya buraya sürükleyin · Kabul edilen: .pdf, .jpg, .jpeg, .png</p>
            </div>
          </div>

          {files.length > 0 && (
            <ul className="mt-3 divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <FileText size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-gray-700">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-600"
                    aria-label="Dosyayı kaldır"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <div className="mt-2 p-3 bg-red-50 rounded-lg text-xs text-red-600">{error}</div>}

          {files.length > 0 && (
            <button
              onClick={handleSend}
              disabled={uploading}
              className="btn-primary btn-fill btn-fill-white border-2 border-primary-700 disabled:border-transparent hover:bg-primary-700 enabled:hover:text-primary-700 transition-colors duration-300 w-full mt-3 flex items-center justify-center gap-2 rounded-full"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={15} />
              )}
              {files.length} Dosyayı Gönder
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function DocumentUploadPage() {
  const { token } = useParams();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [participantFile, setParticipantFile] = useState(null);
  const [participantUploading, setParticipantUploading] = useState(false);
  const [participantError, setParticipantError] = useState(null);
  const [participantDone, setParticipantDone] = useState(false);

  const [commitmentFile, setCommitmentFile] = useState(null);
  const [commitmentUploading, setCommitmentUploading] = useState(false);
  const [commitmentError, setCommitmentError] = useState(null);
  const [commitmentDone, setCommitmentDone] = useState(false);

  useEffect(() => {
    loadReservation();
  }, [token]);

  const loadReservation = async () => {
    setLoading(true);
    try {
      const r = await documentsAPI.getByToken(token);
      setReservation(r.data.data);
      setParticipantDone(r.data.data.participant_file_status === 'UPLOADED' || r.data.data.participant_file_status === 'VALIDATED');
      setCommitmentDone(['UPLOADED', 'APPROVED'].includes(r.data.data.commitment_status));
    } catch (err) {
      setError(err.response?.data?.message || 'Geçersiz veya süresi dolmuş bağlantı.');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantFileSelect = (file) => {
    setParticipantFile(file);
    setParticipantError(null);
  };

  const handleParticipantSend = async () => {
    if (!participantFile) return;
    setParticipantUploading(true);
    setParticipantError(null);
    try {
      const fd = new FormData();
      fd.append('participantFile', participantFile);
      const res = await documentsAPI.uploadParticipants(token, fd);
      setParticipantDone(true);
      // Listede 18 yaş altı çıkarsa sunucu muvafakatname gerektiğini de bildirir
      toast.success(res.data.message, { duration: res.data.data?.minor_participant_count ? 8000 : 4000 });
      loadReservation();
    } catch (err) {
      const errData = err.response?.data;
      setParticipantError(errData?.errors || [errData?.message || 'Dosya gönderilemedi.']);
    } finally {
      setParticipantUploading(false);
    }
  };

  const handleCommitmentFileSelect = (file) => {
    setCommitmentFile(file);
    setCommitmentError(null);
  };

  const handleCommitmentSend = async () => {
    if (!commitmentFile) return;
    setCommitmentUploading(true);
    setCommitmentError(null);
    try {
      const fd = new FormData();
      fd.append('commitmentFile', commitmentFile);
      await documentsAPI.uploadCommitment(token, fd);
      setCommitmentDone(true);
      toast.success('Taahhütname başarıyla gönderildi!');
      loadReservation();
    } catch (err) {
      setCommitmentError(err.response?.data?.message || 'Dosya gönderilemedi.');
    } finally {
      setCommitmentUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Geçersiz Bağlantı</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  const needsConsent = reservation.requires_parental_consent;
  const consentDone = !needsConsent || ['UPLOADED', 'APPROVED'].includes(reservation.consent_status);
  const bothDone = participantDone && commitmentDone && consentDone;
  const consentBadge = CONSENT_STATUS[reservation.consent_status] || CONSENT_STATUS.NOT_UPLOADED;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* No page-local header — the global floating Navbar is the only
          header now. */}
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-8 space-y-6">
        {/* All done banner */}
        {bothDone && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-4">
            <CheckCircle size={28} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Tüm belgeler başarıyla yüklendi!</p>
              <p className="text-sm text-green-600">Rezervasyonunuz için gerekli belgeler tamamlandı.</p>
            </div>
          </div>
        )}

        {/* Reservation summary card */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary-600" /> Rezervasyon Özeti
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Rezervasyon No</span>
              <p className="font-bold text-primary-700 text-lg">{reservation.reservation_number}</p>
            </div>
            <div>
              <span className="text-gray-400">Yetkili</span>
              <p className="font-medium text-gray-900">{reservation.authorized_name}</p>
            </div>
            <div>
              <span className="text-gray-400">Kamp Merkezi</span>
              <p className="font-medium text-gray-900">{reservation.camp_center?.name}</p>
            </div>
            <div>
              <span className="text-gray-400">Katılımcı Sayısı</span>
              <p className="font-medium text-gray-900">{reservation.participant_count} kişi</p>
            </div>
            <div>
              <span className="text-gray-400">Giriş</span>
              <p className="font-medium text-gray-900">{formatDateTime(reservation.start_datetime)}</p>
            </div>
            <div>
              <span className="text-gray-400">Çıkış</span>
              <p className="font-medium text-gray-900">{formatDateTime(reservation.end_datetime)}</p>
            </div>
          </div>

          {/* Document status summary */}
          <div className={`mt-5 pt-4 border-t border-gray-100 grid gap-3 ${needsConsent ? 'sm:grid-cols-3' : 'grid-cols-2'}`}>
            <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${
              participantDone ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
            }`}>
              {participantDone ? <CheckCircle size={15} /> : <Clock size={15} />}
              {participantDone ? 'Katılımcı Listesi Yüklendi' : 'Katılımcı Listesi Bekleniyor'}
            </div>
            <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${
              commitmentDone ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
            }`}>
              {commitmentDone ? <CheckCircle size={15} /> : <Clock size={15} />}
              {commitmentDone ? 'Taahhütname Yüklendi' : 'Taahhütname Bekleniyor'}
            </div>
            {needsConsent && (
              <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${consentBadge.className}`}>
                <consentBadge.icon size={15} />
                {consentBadge.text}
              </div>
            )}
          </div>
        </div>

        {/* Participant List Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users size={16} className="text-primary-600" /> Katılımcı Listesi
            </h3>
            <a
              href={documentsAPI.downloadExcelTemplate(token)}
              className="btn-fill flex items-center gap-1.5 text-sm text-primary-600 hover:text-white font-medium bg-primary-50 px-4 py-1.5 rounded-full transition-colors duration-300"
            >
              <Download size={14} /> Excel Taslağını İndir
            </a>
          </div>

          <div className="bg-red-50 rounded-lg p-4 mb-4 text-sm text-red-800">
            <p className="font-medium mb-1">Nasıl yapılır?</p>
            <ol className="list-decimal list-inside space-y-1 text-red-700">
              <li>Excel taslağını indirin ({reservation.participant_count} satır hazır gelecek; grubunuz küçüldüyse fazla satırları boş bırakın)</li>
              <li>Dosyadaki bütün bilgileri doldurun</li>
              {reservation.guardian_phone_required ? (
                <li><strong>Her katılımcı için veli telefon numarası zorunludur</strong> (katılımcının kendi telefonu isteğe bağlıdır)</li>
              ) : (
                <li>Telefon ve veli telefon numarası alanları isteğe bağlıdır</li>
              )}
              <li>Dosyayı aşağıdan yükleyin</li>
            </ol>
          </div>

          {!participantDone ? (
            <>
              <FileUploadArea
                accept=".xlsx,.xls"
                label="Doldurulmuş katılımcı listesini seçin"
                onFile={handleParticipantFileSelect}
                error={participantError}
              />
              {participantFile && (
                <button
                  onClick={handleParticipantSend}
                  disabled={participantUploading}
                  className="btn-primary btn-fill btn-fill-white border-2 border-primary-700 disabled:border-transparent hover:bg-primary-700 enabled:hover:text-primary-700 transition-colors duration-300 w-full mt-3 flex items-center justify-center gap-2 rounded-full"
                >
                  {participantUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  Gönder
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-800">Katılımcı listesi başarıyla yüklendi</p>
                <p className="text-xs text-green-600">
                  {reservation.participant_list_locked
                    ? 'Kamp merkezi tarafından onaylandı — değişiklik için kamp merkezi ile iletişime geçin'
                    : `${reservation.uploaded_participant_count} katılımcı kaydedildi`}
                </p>
              </div>
              {!reservation.participant_list_locked && (
                <button
                  onClick={() => { setParticipantFile(null); setParticipantDone(false); }}
                  className="ml-auto text-xs text-green-600 hover:text-green-700 underline"
                >
                  Yeniden Yükle
                </button>
              )}
            </div>
          )}
        </div>

        {/* Commitment Document Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText size={16} className="text-primary-600" /> Taahhütname
            </h3>
            <a
              href={documentsAPI.downloadCommitmentTemplate(token)}
              className="btn-fill flex items-center gap-1.5 text-sm text-primary-600 hover:text-white font-medium bg-primary-50 px-4 py-1.5 rounded-full transition-colors duration-300"
              download
            >
              <Download size={14} /> Taahhütnameyi İndir
            </a>
          </div>

          <div className="bg-red-50 rounded-lg p-4 mb-4 text-sm text-red-800">
            <p className="font-medium mb-1">Nasıl yapılır?</p>
            <ol className="list-decimal list-inside space-y-1 text-red-700">
              <li>Taahhütname belgesini indirin (rezervasyon bilgileriniz otomatik olarak dolduruldu)</li>
              <li>Word belgesini açıp bilgilerinizi kontrol edin ve yazdırın</li>
              <li>Yetkili kişi ıslak imza ile imzalasın</li>
              <li>Belgeyi tarayın veya net fotoğrafını çekin</li>
              <li>PDF, JPG, JPEG veya PNG formatında yükleyin</li>
            </ol>
          </div>

          {!commitmentDone ? (
            <>
              <FileUploadArea
                accept=".pdf,.jpg,.jpeg,.png"
                label="Islak İmzalı Taahhütnameyi Yükle"
                onFile={handleCommitmentFileSelect}
                error={commitmentError}
              />
              {commitmentFile && (
                <button
                  onClick={handleCommitmentSend}
                  disabled={commitmentUploading}
                  className="btn-primary btn-fill btn-fill-white border-2 border-primary-700 disabled:border-transparent hover:bg-primary-700 enabled:hover:text-primary-700 transition-colors duration-300 w-full mt-3 flex items-center justify-center gap-2 rounded-full"
                >
                  {commitmentUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  Gönder
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-800">Taahhütname başarıyla yüklendi</p>
                <p className="text-xs text-green-600">
                  {reservation.commitment_locked
                    ? 'Kamp merkezi tarafından onaylandı'
                    : 'Kamp merkezi tarafından incelenecektir'}
                </p>
              </div>
              {!reservation.commitment_locked && (
                <button
                  onClick={() => { setCommitmentFile(null); setCommitmentDone(false); }}
                  className="ml-auto text-xs text-green-600 hover:text-green-700 underline"
                >
                  Yeniden Yükle
                </button>
              )}
            </div>
          )}
        </div>

        {needsConsent && <ConsentCard token={token} reservation={reservation} onUploaded={loadReservation} />}
      </div>
    </div>
  );
}
