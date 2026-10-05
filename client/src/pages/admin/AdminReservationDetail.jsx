import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, MapPin,
  Utensils, FileText, User, AlertTriangle, Send, ListChecks, Paperclip, Download, Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminReservationsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { isHQ, isCenterAdmin } from '../../utils/roles';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RejectReservationModal from '../../components/admin/RejectReservationModal';
import { downloadAuthenticatedFile } from '../../utils/download';
import { formatDateTime, formatDate, getGenderLabel, getGroupCompositionLabel, getGroupNatureLabel, getEducationLevelLabel, getDocStatusLabel } from '../../utils/helpers';

const IN_REVIEW_STATUSES = ['PENDING', 'FORWARDED', 'HQ_APPROVED'];
// Görüntülenen durumlar; sunucu çıkışı geçmiş (COMPLETED) kaydı iptal etmez
const CANCELLABLE_DISPLAY_STATUSES = [...IN_REVIEW_STATUSES, 'DOCUMENTS_PENDING', 'DOCUMENTS_IN_REVIEW', 'APPROVED'];

const fullName = (a) => (a ? `${a.first_name} ${a.last_name}` : '');

// Talebin merkez → genel merkez → merkez onay adımları ve her adımı yapan hesap.
function ApprovalTrail({ r }) {
  const steps = [];
  if (r.forwarded_at) {
    steps.push({
      title: 'Genel merkeze yönlendirildi',
      by: fullName(r.forwardedByAdmin),
      at: r.forwarded_at,
      note: r.center_note
    });
  }
  if (r.hq_reviewed_at) {
    steps.push({ title: 'Genel merkez onayı', by: fullName(r.hqReviewedByAdmin), at: r.hq_reviewed_at });
  }
  if (r.reviewed_at && r.reviewedByAdmin) {
    const title = r.status === 'REJECTED'
      ? `Reddedildi (${r.rejection_stage === 'HQ' ? 'genel merkez' : 'kamp merkezi'})`
      : r.status === 'CANCELLED' ? 'İptal edildi' : 'Kamp merkezi son onayı';
    steps.push({ title, by: fullName(r.reviewedByAdmin), at: r.reviewed_at, danger: ['REJECTED', 'CANCELLED'].includes(r.status) });
  }
  if (steps.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ListChecks size={16} className="text-primary-600" /> Onay Süreci
      </h3>
      <div className="space-y-3">
        {steps.map(step => (
          <div key={step.title} className="flex items-start gap-3 text-sm">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${step.danger ? 'bg-red-500' : 'bg-green-500'}`} />
            <div>
              <p className="font-medium text-gray-800">{step.title}</p>
              <p className="text-gray-600">{step.by}</p>
              <p className="text-xs text-gray-400">{formatDateTime(step.at)}</p>
              {step.note && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded px-2 py-1">Not: {step.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 sm:w-48 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
    </div>
  );
}

export default function AdminReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capacityData, setCapacityData] = useState(null);

  const [rejectModal, setRejectModal] = useState(false);
  const [forwardModal, setForwardModal] = useState(false);
  const [forwardNote, setForwardNote] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resR, capR] = await Promise.allSettled([
        adminReservationsAPI.getById(id),
        adminReservationsAPI.capacityCheck(id)
      ]);
      if (resR.status === 'fulfilled') setReservation(resR.value.data.data);
      if (capR.status === 'fulfilled') setCapacityData(capR.value.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const r = await adminReservationsAPI.approve(id);
      toast.success(r.data.message);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Onaylama işlemi başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      const r = await adminReservationsAPI.reject(id, { rejection_reason: reason });
      toast.success(r.data.message);
      setRejectModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Red işlemi başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadProgramFile = async () => {
    try {
      await downloadAuthenticatedFile(adminReservationsAPI.downloadProgramFile(id), reservation.program_file_name);
    } catch (err) {
      toast.error('Dosya indirilemedi.');
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const r = await adminReservationsAPI.cancel(id, { reason: cancelReason.trim() });
      toast.success(r.data.message);
      setCancelModal(false);
      setCancelReason('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'İptal işlemi başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForward = async () => {
    setActionLoading(true);
    try {
      const r = await adminReservationsAPI.forward([{ id: Number(id), note: forwardNote.trim() }]);
      toast.success(r.data.message);
      setForwardModal(false);
      setForwardNote('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Yönlendirme başarısız.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner center />;
  if (!reservation) return <div className="text-center py-12 text-gray-500">Rezervasyon bulunamadı.</div>;

  const r = reservation;
  const hq = isHQ(admin);
  const center = isCenterAdmin(admin);
  const isPending = IN_REVIEW_STATUSES.includes(r.status);
  // Genel merkez, merkez yöneticisine ulaşılamadığında merkezin adımlarını
  // (yönlendirme ve son onay) merkez adına yapabilir.
  const canForward = r.status === 'PENDING' && (center || hq);
  const canApprove = (hq && ['FORWARDED', 'HQ_APPROVED'].includes(r.status)) || (center && r.status === 'HQ_APPROVED');
  const canReject = hq
    ? ['PENDING', 'FORWARDED', 'HQ_APPROVED'].includes(r.status)
    : center && ['PENDING', 'HQ_APPROVED'].includes(r.status);
  const canCancel = hq && CANCELLABLE_DISPLAY_STATUSES.includes(r.status);
  const onBehalfFinalApproval = hq && r.status === 'HQ_APPROVED';

  const handleApproveClick = () => {
    if (onBehalfFinalApproval && !window.confirm(
      'Son onay normalde kamp merkezi yöneticisi tarafından verilir. Merkez adına son onayı vermek istediğinize emin misiniz? Başvuru sahibine belge linkiyle SMS gönderilecektir.'
    )) return;
    handleApprove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{r.reservation_number}</h1>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-gray-500 text-sm mt-1">Başvuru tarihi: {formatDateTime(r.created_at)}</p>
        </div>

        {/* Action buttons */}
        {(canReject || canApprove || canForward || canCancel) && (
          <div className="flex flex-wrap gap-3">
            {canCancel && (
              <button
                onClick={() => setCancelModal(true)}
                disabled={actionLoading}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Ban size={16} /> İptal Et
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setRejectModal(true)}
                disabled={actionLoading}
                className="btn-danger flex items-center gap-2 text-sm"
              >
                <XCircle size={16} /> Reddet
              </button>
            )}
            {canForward && (
              <button
                onClick={() => setForwardModal(true)}
                disabled={actionLoading}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Send size={16} /> {hq ? 'Merkez Adına Yönlendir' : 'Genel Merkeze Yönlendir'}
              </button>
            )}
            {canApprove && (
              <button
                onClick={handleApproveClick}
                disabled={actionLoading || (capacityData && !capacityData.can_approve)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
                {r.status === 'FORWARDED' ? 'Onayla' : onBehalfFinalApproval ? 'Merkez Adına Son Onay' : 'Son Onayı Ver'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Capacity check */}
      {isPending && capacityData && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          capacityData.can_approve ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {capacityData.can_approve
            ? <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
            : <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-medium ${capacityData.can_approve ? 'text-green-800' : 'text-red-800'}`}>
              {capacityData.can_approve ? 'Kapasite Uygun' : 'Kapasite Yetersiz'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {capacityData.camp_center.name}: Toplam {capacityData.camp_center.total_capacity} kişi ·
              Kullanılan {capacityData.used_capacity} kişi ·
              Kalan {capacityData.remaining_capacity} kişi ·
              Bu talep {capacityData.requested_count} kişi
            </p>
            {capacityData.pending_overlapping?.length > 0 && (
              <p className="text-xs text-rose-700 mt-1">
                ⚠️ Aynı tarihte {capacityData.pending_overlapping.length} bekleyen talep daha var ({capacityData.potential_additional_usage} kişi).
              </p>
            )}
            {capacityData.exceeds_with_hq_approved && (
              <p className="text-xs text-red-700 font-medium mt-1">
                ⚠️ Aynı tarihlerde genel merkez onayı almış, son onay bekleyen {capacityData.hq_approved_usage} kişilik talep var.
                Bu talep ile birlikte kapasite aşılıyor; ikisinden yalnızca biri son onayı alabilir.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Date conflict with an already-approved reservation */}
      {isPending && capacityData?.approved_overlapping?.length > 0 && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          capacityData.has_gender_conflict ? 'bg-red-50 border border-red-200' : 'bg-rose-50 border border-rose-200'
        }`}>
          <AlertTriangle size={18} className={`flex-shrink-0 mt-0.5 ${capacityData.has_gender_conflict ? 'text-red-600' : 'text-rose-600'}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${capacityData.has_gender_conflict ? 'text-red-800' : 'text-rose-800'}`}>
              {capacityData.has_gender_conflict
                ? 'Tarih Çakışması ve Cinsiyet Uyuşmazlığı!'
                : 'Onaylanmış Rezervasyonla Tarih Çakışması'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Bu talep, aynı kamp merkezinde daha önce onaylanmış {capacityData.approved_overlapping.length} rezervasyon ile aynı tarihlere denk geliyor.
              {capacityData.has_gender_conflict && ' Çakışan rezervasyonlardan en az biri farklı cinsiyet grubuna ait.'}
            </p>
            <div className="mt-2 space-y-1.5">
              {capacityData.approved_overlapping.map(o => (
                <Link
                  key={o.id}
                  to={`/admin/rezervasyonlar/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs bg-white/70 hover:bg-white rounded-lg px-3 py-2 border border-black/5 transition-colors"
                >
                  <span className="font-mono text-gray-600">{o.reservation_number}</span>
                  <span className="text-gray-500">{getGenderLabel(o.group_gender)} · {o.participant_count} kişi</span>
                  <span className="text-gray-400">{formatDateTime(o.start_datetime)} – {formatDateTime(o.end_datetime)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Workflow hints */}
      {r.status === 'HQ_APPROVED' && center && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
          Bu talep genel merkez tarafından onaylandı. <strong>Son Onayı Ver</strong> butonuna bastığınızda başvuru sahibine
          rezervasyonun onaylandığı ve belgeleri yükleyeceği link SMS ile gönderilecektir.
        </div>
      )}
      {r.status === 'FORWARDED' && r.center_note && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-sm font-medium text-indigo-800 mb-1">Kamp Merkezinin Notu</p>
          <p className="text-sm text-indigo-700 whitespace-pre-wrap">{r.center_note}</p>
        </div>
      )}

      {/* Rejection reason */}
      {r.status === 'REJECTED' && r.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800 mb-1">
            Red Nedeni {r.rejection_stage && `(${r.rejection_stage === 'HQ' ? 'Genel Merkez' : 'Kamp Merkezi'})`}
          </p>
          <p className="text-sm text-red-700">{r.rejection_reason}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Authorized info */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={16} className="text-primary-600" /> Yetkili Bilgileri
            </h3>
            <InfoRow label="Ad Soyad" value={`${r.authorized_first_name} ${r.authorized_last_name}`} />
            <InfoRow label="Görev" value={r.authorized_role} />
            <InfoRow label="Telefon" value={r.phone} />
            <InfoRow label="E-posta" value={r.email} />
            <InfoRow label="Kurum Bilgisi" value={r.institution_name} />
            <InfoRow label="İl / İlçe" value={r.province && r.district ? `${r.province} / ${r.district}` : (r.province || r.district)} />
          </div>

          {/* Reservation details */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-primary-600" /> Rezervasyon Detayları
            </h3>
            <InfoRow label="Grup Türü" value={getGenderLabel(r.group_gender)} />
{/*             {r.group_composition && <InfoRow label="Grup Kompozisyonu" value={getGroupCompositionLabel(r.group_composition)} />}
 */}            {r.group_nature && <InfoRow label="Grup Niteliği" value={getGroupNatureLabel(r.group_nature)} />}
            {r.education_level && <InfoRow label="Öğrenim Durumu" value={getEducationLevelLabel(r.education_level)} />}
            <InfoRow label="Kamp Merkezi" value={r.campCenter?.name} />
            <InfoRow label="Katılımcı Sayısı" value={`${r.participant_count} kişi`} />
            <InfoRow label="Kullanım Amacı" value={r.purpose} />
            {r.purpose_detail && <InfoRow label="Amaç Detayı" value={r.purpose_detail} />}
            <InfoRow label="Başlangıç" value={formatDateTime(r.start_datetime)} />
            <InfoRow label="Bitiş" value={formatDateTime(r.end_datetime)} />
            <InfoRow label="Toplam Süre" value={`${r.total_days || '—'} gün / ${r.total_nights || '—'} gece`} />
          </div>

          {/* Meals */}
          {r.meals && r.meals.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Utensils size={16} className="text-primary-600" /> Yemek Tercihleri
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Kahvaltı</th>
                      {r.campCenter?.has_dinner && (
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Akşam Yemeği</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {r.meals.map(m => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 text-gray-700">{formatDate(m.meal_date)}</td>
                        <td className="px-3 py-2 text-center">
                          {m.breakfast_selected
                            ? <span className="text-green-500">✓</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        {r.campCenter?.has_dinner && (
                          <td className="px-3 py-2 text-center">
                            {m.dinner_selected
                              ? <span className="text-green-500">✓</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-primary-600" /> Açıklama
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.description || '—'}</p>
          </div>

          {/* Program akışı dosyası */}
          {r.program_file_name && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Paperclip size={16} className="text-primary-600" /> Program Akışı
              </h3>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <FileText size={28} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.program_file_name}</p>
                  {r.program_file_size && (
                    <p className="text-xs text-gray-500 mt-0.5">{(r.program_file_size / 1024 / 1024).toFixed(1)} MB</p>
                  )}
                </div>
                <button
                  onClick={handleDownloadProgramFile}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                >
                  <Download size={14} /> İndir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Document status */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-primary-600" /> Belge Durumu
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Katılımcı Listesi</p>
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${
                  r.participant_file_status === 'UPLOADED' || r.participant_file_status === 'VALIDATED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {r.participant_file_status === 'UPLOADED' || r.participant_file_status === 'VALIDATED'
                    ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  {getDocStatusLabel(r.participant_file_status)}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Taahhütname</p>
                <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${
                  ['UPLOADED', 'APPROVED'].includes(r.commitment_status)
                    ? 'bg-green-100 text-green-700'
                    : r.commitment_status === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {['UPLOADED', 'APPROVED'].includes(r.commitment_status) ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  {getDocStatusLabel(r.commitment_status)}
                </span>
              </div>

              {r.needs_parental_consent && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Veli Muvafakatnamesi</p>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${
                    ['UPLOADED', 'APPROVED'].includes(r.consent_status)
                      ? 'bg-green-100 text-green-700'
                      : r.consent_status === 'REJECTED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {['UPLOADED', 'APPROVED'].includes(r.consent_status) ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                    {getDocStatusLabel(r.consent_status)}
                  </span>
                </div>
              )}

              {['DOCUMENTS_PENDING', 'DOCUMENTS_IN_REVIEW', 'APPROVED', 'COMPLETED'].includes(r.status) && (
                <Link to={`/admin/belgeler/${r.id}`} className="block mt-3 text-center text-sm text-primary-600 hover:text-primary-700 font-medium bg-primary-50 hover:bg-primary-100 py-2 rounded-lg transition-colors">
                  Belgeleri Görüntüle →
                </Link>
              )}
            </div>
          </div>

          {/* Status log */}
       {/*    {r.statusLogs && r.statusLogs.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Info size={16} className="text-primary-600" /> Durum Geçmişi
              </h3>
              <div className="space-y-3">
                {r.statusLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-700">{log.new_status}</p>
                      {log.description && <p className="text-gray-500">{log.description}</p>}
                      <p className="text-gray-400">{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          <ApprovalTrail r={r} />
        </div>
      </div>

      <RejectReservationModal
        isOpen={rejectModal}
        onClose={() => setRejectModal(false)}
        onConfirm={handleReject}
        loading={actionLoading}
        reservationNumber={r.reservation_number}
        recipientText={hq ? 'kamp merkezi yöneticisine' : 'genel merkez adminlerine'}
      />

      {/* Cancel Modal */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Rezervasyonu İptal Et">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              <strong>{r.reservation_number}</strong> numaralı rezervasyonu iptal etmek istediğinize emin misiniz?
              Başvuru sahibine iptal bilgisi SMS ile gönderilecektir. Bu işlem geri alınamaz.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              İptal Nedeni <span className="text-gray-400 font-normal">(isteğe bağlı, yalnızca kayıtlarda tutulur)</span>
            </label>
            <textarea
              className="input-field"
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setCancelModal(false)} className="btn-secondary">Vazgeç</button>
            <button onClick={handleCancel} disabled={actionLoading} className="btn-danger flex items-center gap-2">
              {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Ban size={16} />}
              Evet, İptal Et
            </button>
          </div>
        </div>
      </Modal>

      {/* Forward Modal */}
      <Modal isOpen={forwardModal} onClose={() => setForwardModal(false)} title="Genel Merkeze Yönlendir">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {hq ? (
              <>
                <strong>{r.reservation_number}</strong> numaralı talep <strong>kamp merkezi adına</strong> genel merkeze
                yönlendirilecek. Bunu yalnızca merkez yöneticisine ulaşılamadığında yapın; ardından talebi onaylayabilirsiniz.
              </>
            ) : (
              <>
                <strong>{r.reservation_number}</strong> numaralı talep genel merkeze yönlendirilecek ve genel merkez
                adminlerine SMS gönderilecektir.
              </>
            )}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Not <span className="text-gray-400 font-normal">(isteğe bağlı, SMS'e eklenir)</span>
            </label>
            <textarea
              className="input-field"
              rows={3}
              maxLength={300}
              placeholder="Genel merkeze kısa bir not yazın."
              value={forwardNote}
              onChange={e => setForwardNote(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">{forwardNote.length}/300</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setForwardModal(false)} className="btn-secondary">Vazgeç</button>
            <button onClick={handleForward} disabled={actionLoading} className="btn-primary flex items-center gap-2">
              {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
              Yönlendir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
