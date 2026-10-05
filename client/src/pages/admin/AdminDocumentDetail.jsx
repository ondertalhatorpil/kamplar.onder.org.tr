import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, XCircle, Search, Eye, Users, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminDocumentsAPI, adminReservationsAPI } from '../../api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { formatDateTime, formatDateShort, getDocStatusLabel } from '../../utils/helpers';
import { downloadAuthenticatedFile } from '../../utils/download';
import { useAuth } from '../../context/AuthContext';
import { isCenterAdmin } from '../../utils/roles';

// Whole years between the given birth date and today (accounts for whether
// this year's birthday has already happened).
function calculateAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export default function AdminDocumentDetail() {
  const { reservationId } = useParams();
  const { admin } = useAuth();
  const canReview = isCenterAdmin(admin);
  const [reservation, setReservation] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantPagination, setParticipantPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partPage, setPartPage] = useState(1);
  const [partSearch, setPartSearch] = useState('');
  const [partLoading, setPartLoading] = useState(false);
  const [latestCommitment, setLatestCommitment] = useState(null);

  const [consents, setConsents] = useState([]);
  const [consentRejectModal, setConsentRejectModal] = useState(false);
  const [consentRejectReason, setConsentRejectReason] = useState('');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadReservation(); }, [reservationId]);
  useEffect(() => { loadParticipants(); }, [partPage, partSearch, reservationId]);

  const loadReservation = async () => {
    setLoading(true);
    try {
      const r = await adminReservationsAPI.getById(reservationId);
      setReservation(r.data.data);

      if (r.data.data.needs_parental_consent) {
        const consentR = await adminDocumentsAPI.getConsents(reservationId);
        setConsents(consentR.data.data);
      }

      // Load latest commitment
      const commitDocs = r.data.data.commitmentDocuments;
      if (commitDocs && commitDocs.length > 0) {
        const docR = await adminDocumentsAPI.getCommitmentDocument(commitDocs[0].id);
        setLatestCommitment(docR.data.data);
      }
    } catch {}
    setLoading(false);
  };

  const loadParticipants = async () => {
    setPartLoading(true);
    try {
      const r = await adminDocumentsAPI.getParticipants(reservationId, {
        page: partPage, limit: 20, search: partSearch || undefined
      });
      setParticipants(r.data.data);
      setParticipantPagination(r.data.pagination);
    } catch {}
    setPartLoading(false);
  };

  const handleDownloadParticipantFile = async (file) => {
    try {
      await downloadAuthenticatedFile(adminDocumentsAPI.downloadParticipantFile(file.id), file.original_file_name || 'katilimci-listesi.xlsx');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dosya indirilemedi.');
    }
  };

  const handleDownloadCommitmentDocument = async (doc) => {
    try {
      await downloadAuthenticatedFile(adminDocumentsAPI.downloadCommitmentDocument(doc.id), doc.original_file_name || 'taahhutname.pdf');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dosya indirilemedi.');
    }
  };

  const handleDownloadConsent = async (doc) => {
    try {
      await downloadAuthenticatedFile(adminDocumentsAPI.downloadConsent(doc.id), doc.original_file_name);
    } catch (err) {
      toast.error('Dosya indirilemedi.');
    }
  };

  const handleApproveConsents = async () => {
    setActionLoading(true);
    try {
      const r = await adminDocumentsAPI.approveConsents(reservationId);
      toast.success(r.data.message);
      loadReservation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConsents = async () => {
    if (consentRejectReason.trim().length < 5) {
      toast.error('Red nedeni gereklidir.');
      return;
    }
    setActionLoading(true);
    try {
      const r = await adminDocumentsAPI.rejectConsents(reservationId, { rejection_reason: consentRejectReason });
      toast.success(r.data.message);
      setConsentRejectModal(false);
      setConsentRejectReason('');
      loadReservation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveCommitment = async () => {
    if (!latestCommitment) return;
    setActionLoading(true);
    try {
      const res = await adminDocumentsAPI.approveCommitment(latestCommitment.id);
      toast.success(res.data.message);
      loadReservation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCommitment = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast.error('Red nedeni gereklidir.');
      return;
    }
    setActionLoading(true);
    try {
      await adminDocumentsAPI.rejectCommitment(latestCommitment.id, { rejection_reason: rejectReason });
      toast.success('Taahhütname reddedildi ve kullanıcıya SMS gönderildi.');
      setRejectModal(false);
      setRejectReason('');
      loadReservation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner center />;
  if (!reservation) return <div className="text-center py-12 text-gray-500">Rezervasyon bulunamadı.</div>;

  const r = reservation;
  const latestParticipantFile = r.participantFiles?.[0];

  // Onay için istenen tüm belgelerin yüklenmiş olması gerekir (sunucu da kontrol eder)
  const missingDocs = [
    !['UPLOADED', 'VALIDATED'].includes(r.participant_file_status) && 'katılımcı listesi',
    !['UPLOADED', 'APPROVED'].includes(r.commitment_status) && 'taahhütname',
    r.needs_parental_consent && !['UPLOADED', 'APPROVED'].includes(r.consent_status) && 'veli muvafakatnameleri'
  ].filter(Boolean);
  const canApproveDocs = missingDocs.length === 0;
  const canUnlock = canReview && r.document_upload_token && (r.commitment_status === 'APPROVED' || r.consent_status === 'APPROVED');
  const missingDocsNotice = !canApproveDocs && (
    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
      Onaylamak için önce tüm belgelerin yüklenmesi gerekir. Eksik: {missingDocs.join(', ')}.
    </p>
  );

  const handleUnlock = async () => {
    if (!window.confirm('Onaylanmış belgeler başvuru sahibinin yeniden yükleyebilmesi için açılacak ve başvurana SMS gönderilecek. Yeni belgeleri tekrar onaylamanız gerekecek. Devam edilsin mi?')) return;
    setActionLoading(true);
    try {
      const res = await adminReservationsAPI.unlockDocuments(reservationId);
      toast.success(res.data.message);
      loadReservation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'İşlem başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/belgeler" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{r.reservation_number}</h1>
          <p className="text-gray-500 text-sm">{r.authorized_first_name} {r.authorized_last_name} · {r.campCenter?.name} · {r.participant_count} kişi</p>
        </div>
        {canUnlock && (
          <button onClick={handleUnlock} disabled={actionLoading} className="btn-secondary ml-auto text-sm">
            Belgeleri Düzenlemeye Aç
          </button>
        )}
      </div>

      {canUnlock && (
        <p className="text-xs text-gray-500 -mt-3">
          Onaylanan belgeler başvuru sahibi tarafından değiştirilemez. Değişiklik gerekiyorsa "Belgeleri Düzenlemeye Aç" ile yeniden yüklemeye açabilirsiniz.
        </p>
      )}

      {/* Participant List Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users size={16} className="text-primary-600" /> Katılımcı Listesi
          </h3>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              r.participant_file_status === 'UPLOADED' || r.participant_file_status === 'VALIDATED'
                ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {getDocStatusLabel(r.participant_file_status)}
            </span>
            {latestParticipantFile && (
              <button
                onClick={() => handleDownloadParticipantFile(latestParticipantFile)}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Download size={14} /> Excel İndir
              </button>
            )}
          </div>
        </div>

        {participants.length > 0 ? (
          <>
            {/* Search */}
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-9 text-sm py-2"
                  placeholder="Katılımcı ara..."
                  value={partSearch}
                  onChange={e => { setPartSearch(e.target.value); setPartPage(1); }}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-3 py-2.5 text-left">Sıra No</th>
                    <th className="px-3 py-2.5 text-left">Adı Soyadı</th>
                    <th className="px-3 py-2.5 text-left">TC Kimlik No</th>
                    <th className="px-3 py-2.5 text-left">Doğum Tarihi</th>
                    <th className="px-3 py-2.5 text-left">Telefon</th>
                    <th className="px-3 py-2.5 text-left">Veli Telefon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {participants.map(p => {
                    const age = calculateAge(p.birth_date);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-gray-500">{p.row_number}</td>
                        <td className="px-3 py-2.5 text-gray-900 font-medium">{p.full_name}</td>
                        <td className="px-3 py-2.5 text-gray-600">{p.tc_no || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {p.birth_date ? (
                            <>
                              {formatDateShort(p.birth_date)}
                              {age !== null && <span className="text-gray-400"> ({age} yaş)</span>}
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{p.phone || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{p.guardian_phone || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pagination={participantPagination} onPageChange={setPartPage} />
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {r.participant_file_status === 'NOT_UPLOADED'
              ? 'Katılımcı listesi henüz yüklenmedi.'
              : 'Katılımcı bulunamadı.'}
          </div>
        )}
      </div>

      {/* Commitment Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText size={16} className="text-primary-600" /> Taahhütname
          </h3>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            r.commitment_status === 'APPROVED' ? 'bg-green-100 text-green-700'
            : r.commitment_status === 'UPLOADED' ? 'bg-rose-100 text-rose-700'
            : r.commitment_status === 'REJECTED' ? 'bg-red-100 text-red-700'
            : 'bg-orange-100 text-orange-700'
          }`}>
            {getDocStatusLabel(r.commitment_status)}
          </span>
        </div>

        {latestCommitment ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <FileText size={32} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{latestCommitment.original_file_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Yüklenme: {formatDateTime(latestCommitment.uploaded_at)}</p>
                {latestCommitment.rejection_reason && (
                  <p className="text-xs text-red-600 mt-1">Red nedeni: {latestCommitment.rejection_reason}</p>
                )}
              </div>
              <button
                onClick={() => handleDownloadCommitmentDocument(latestCommitment)}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Download size={14} /> İndir
              </button>
            </div>

            {/* Actions — belge onayı yalnızca kamp merkezi yöneticisindedir */}
            {latestCommitment.status === 'UPLOADED' && !canReview && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                Taahhütname onayı kamp merkezi yöneticisi tarafından yapılır.
              </div>
            )}
            {latestCommitment.status === 'UPLOADED' && canReview && missingDocsNotice}
            {latestCommitment.status === 'UPLOADED' && canReview && (
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectModal(true)}
                  className="btn-danger flex items-center gap-2 text-sm flex-1"
                >
                  <XCircle size={15} /> Reddet
                </button>
                <button
                  onClick={handleApproveCommitment}
                  disabled={actionLoading || !canApproveDocs}
                  className="btn-primary flex items-center gap-2 text-sm flex-1"
                >
                  {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={15} />}
                  Onayla
                </button>
              </div>
            )}

            {latestCommitment.status === 'APPROVED' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                <CheckCircle size={16} /> Taahhütname onaylandı.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">Taahhütname henüz yüklenmedi.</div>
        )}
      </div>

      {/* Veli Muvafakatnamesi Card (18 yaş altı gruplar) */}
      {r.needs_parental_consent && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary-600" /> Veli Muvafakatnameleri
              <span className="text-xs font-normal text-gray-400">
                ({consents.length} dosya · {r.minor_participant_count > 0
                  ? `18 yaş altı katılımcı: ${r.minor_participant_count}`
                  : `${r.participant_count} katılımcı`})
              </span>
            </h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              r.consent_status === 'APPROVED' ? 'bg-green-100 text-green-700'
              : r.consent_status === 'UPLOADED' ? 'bg-rose-100 text-rose-700'
              : r.consent_status === 'REJECTED' ? 'bg-red-100 text-red-700'
              : 'bg-orange-100 text-orange-700'
            }`}>
              {getDocStatusLabel(r.consent_status)}
            </span>
          </div>

          {r.consent_status === 'REJECTED' && r.consent_rejection_reason && (
            <p className="mb-3 text-xs text-red-600">Red nedeni: {r.consent_rejection_reason}</p>
          )}

          {consents.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
              {consents.map(doc => (
                <li key={doc.id} className="flex items-center gap-3 px-4 py-2.5">
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{doc.original_file_name}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(doc.uploaded_at)}</p>
                  </div>
                  <button
                    onClick={() => handleDownloadConsent(doc)}
                    className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                  >
                    <Download size={14} /> İndir
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-gray-400">Muvafakatname henüz yüklenmedi.</div>
          )}

          {r.minor_participant_count > 0 && consents.length < r.minor_participant_count && (
            <p className="mb-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Katılımcı listesinde 18 yaşından küçük {r.minor_participant_count} kişi var, {consents.length} muvafakatname dosyası yüklendi.
              Toplu tarama değilse eksik muvafakatname olabilir.
            </p>
          )}

          {r.consent_status === 'UPLOADED' && (
            canReview ? (
              <div className="mt-4">
              {missingDocsNotice}
              <div className="flex gap-3">
                <button onClick={() => setConsentRejectModal(true)} className="btn-danger flex items-center gap-2 text-sm flex-1">
                  <XCircle size={15} /> Reddet
                </button>
                <button onClick={handleApproveConsents} disabled={actionLoading || !canApproveDocs} className="btn-primary flex items-center gap-2 text-sm flex-1">
                  {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={15} />}
                  Onayla
                </button>
              </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                Muvafakatname onayı kamp merkezi yöneticisi tarafından yapılır.
              </div>
            )
          )}

          {r.consent_status === 'APPROVED' && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
              <CheckCircle size={16} /> Muvafakatnameler onaylandı.
            </div>
          )}
        </div>
      )}

      <Modal isOpen={consentRejectModal} onClose={() => setConsentRejectModal(false)} title="Muvafakatnameleri Reddet">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Muvafakatnameler reddedilecek ve kullanıcıya red nedeniyle SMS gönderilecektir.
              Kullanıcı eksik/hatalı muvafakatnameleri yeniden yükleyebilir.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Red Nedeni *</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Örn: 3 katılımcının muvafakatnamesi eksik. / İmzasız form var."
              value={consentRejectReason}
              onChange={e => setConsentRejectReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConsentRejectModal(false)} className="btn-secondary">İptal</button>
            <button onClick={handleRejectConsents} disabled={actionLoading} className="btn-danger flex items-center gap-2">
              {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle size={15} />}
              Reddet ve SMS Gönder
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Taahhütnameyi Reddet">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Taahhütname reddedilecek ve kullanıcıya red nedeniyle SMS gönderilecektir.
              Kullanıcı yeni bir taahhütname yükleyebilir.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Red Nedeni *</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Örn: İmza bölümü eksiktir. / Belge okunaklı değil."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRejectModal(false)} className="btn-secondary">İptal</button>
            <button
              onClick={handleRejectCommitment}
              disabled={actionLoading}
              className="btn-danger flex items-center gap-2"
            >
              {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle size={15} />}
              Reddet ve SMS Gönder
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
