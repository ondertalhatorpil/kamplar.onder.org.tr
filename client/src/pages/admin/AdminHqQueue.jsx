import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, CheckCircle, XCircle, ArrowRight, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminReservationsAPI } from '../../api';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RejectReservationModal from '../../components/admin/RejectReservationModal';
import { formatDateTime, getGenderLabel } from '../../utils/helpers';

function RequestCard({ r, busy, onApprove, onReject }) {
  const actionable = r.status === 'FORWARDED';
  return (
    <div className="card p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-gray-900">{r.reservation_number}</span>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-sm text-gray-800 mt-1">
            {r.institution_name} · {r.authorized_first_name} {r.authorized_last_name} · {r.phone}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {r.campCenter?.name} · {formatDateTime(r.start_datetime)} – {formatDateTime(r.end_datetime)} ·{' '}
            {r.participant_count} kişi · {getGenderLabel(r.group_gender)} · {r.purpose}
          </p>
        </div>
        <Link
          to={`/admin/rezervasyonlar/${r.id}`}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          Tüm Detaylar <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex items-start gap-2 text-sm bg-indigo-50 rounded-lg px-3 py-2">
        <MessageSquare size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-indigo-900">{r.center_note || <span className="italic text-indigo-400">Not eklenmemiş</span>}</p>
          {r.forwarded_at && (
            <p className="text-xs text-indigo-500 mt-0.5">
              {r.forwardedByAdmin ? `${r.forwardedByAdmin.first_name} ${r.forwardedByAdmin.last_name}` : 'Kamp merkezi'} · {formatDateTime(r.forwarded_at)}
            </p>
          )}
        </div>
      </div>

      {actionable && (
        <div className="flex gap-3">
          <button onClick={() => onReject(r)} disabled={busy} className="btn-danger flex items-center gap-2 text-sm flex-1 justify-center">
            <XCircle size={15} /> Reddet
          </button>
          <button onClick={() => onApprove(r)} disabled={busy} className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center">
            <CheckCircle size={15} /> Onayla
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminHqQueue() {
  const [searchParams] = useSearchParams();
  const ids = searchParams.get('ids') || '';
  const [linked, setLinked] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [linkedRes, queueRes] = await Promise.all([
        ids ? adminReservationsAPI.getAll({ ids, limit: 100 }) : null,
        adminReservationsAPI.getAll({ status: 'FORWARDED', limit: 100 })
      ]);
      const linkedItems = linkedRes ? linkedRes.data.data : [];
      setLinked(linkedItems);
      setQueue(queueRes.data.data.filter(r => !linkedItems.some(l => l.id === r.id)));
    } catch {
      toast.error('Talepler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [ids]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (r) => {
    setBusyId(r.id);
    try {
      const res = await adminReservationsAPI.approve(r.id);
      toast.success(`${r.reservation_number}: ${res.data.message}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Onaylama başarısız.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (reason) => {
    const r = rejectTarget;
    setBusyId(r.id);
    try {
      const res = await adminReservationsAPI.reject(r.id, { rejection_reason: reason });
      toast.success(`${r.reservation_number}: ${res.data.message}`);
      setRejectTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Red işlemi başarısız.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <LoadingSpinner center />;

  const renderCards = (items) => items.map(r => (
    <RequestCard key={r.id} r={r} busy={busyId === r.id} onApprove={handleApprove} onReject={setRejectTarget} />
  ));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onay Bekleyenler</h1>
          <p className="text-gray-500 text-sm mt-1">Kamp merkezlerinin genel merkeze yönlendirdiği talepler</p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2 text-sm self-start">
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {linked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">SMS ile iletilen talepler ({linked.length})</h2>
          {renderCards(linked)}
        </section>
      )}

      <section className="space-y-3">
        {linked.length > 0 && <h2 className="text-sm font-semibold text-gray-700">Diğer onay bekleyenler ({queue.length})</h2>}
        {queue.length === 0 ? (
          linked.length === 0 && <div className="card text-center py-16 text-gray-400">Onay bekleyen talep yok.</div>
        ) : renderCards(queue)}
      </section>

      <RejectReservationModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        loading={!!busyId}
        reservationNumber={rejectTarget?.reservation_number}
        recipientText="kamp merkezi yöneticisine"
      />
    </div>
  );
}
