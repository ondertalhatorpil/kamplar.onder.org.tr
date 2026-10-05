import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Send, ArrowRight, Inbox, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminReservationsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime, getGenderLabel } from '../../utils/helpers';

function ReservationSummary({ r }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-medium text-gray-900">{r.reservation_number}</span>
        <StatusBadge status={r.status} />
      </div>
      <p className="text-sm text-gray-800 mt-0.5">
        {r.institution_name} · {r.authorized_first_name} {r.authorized_last_name}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        {formatDateTime(r.start_datetime)} – {formatDateTime(r.end_datetime)} · {r.participant_count} kişi · {getGenderLabel(r.group_gender)}
      </p>
    </div>
  );
}

function SimpleList({ title, icon: Icon, items, emptyText, hint }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Icon size={16} className="text-primary-600" /> {title}
          <span className="text-xs font-normal text-gray-400">({items.length})</span>
        </h2>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map(r => (
            <li key={r.id}>
              <Link to={`/admin/rezervasyonlar/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0"><ReservationSummary r={r} /></div>
                <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminCenterRequests() {
  const { admin } = useAuth();
  const [pending, setPending] = useState([]);
  const [hqApproved, setHqApproved] = useState([]);
  const [forwarded, setForwarded] = useState([]);
  const [loading, setLoading] = useState(true);
  // Seçili talepler: id → genel merkeze iletilecek not
  const [selected, setSelected] = useState({});
  const [confirmModal, setConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h, f] = await Promise.all(
        ['PENDING', 'HQ_APPROVED', 'FORWARDED'].map(status =>
          adminReservationsAPI.getAll({ status, limit: 100 }).then(r => r.data.data)
        )
      );
      setPending(p);
      setHqApproved(h);
      setForwarded(f);
      setSelected(sel => Object.fromEntries(Object.entries(sel).filter(([id]) => p.some(r => r.id === Number(id)))));
    } catch {
      toast.error('Talepler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggle = (id) => setSelected(sel => {
    const next = { ...sel };
    if (id in next) delete next[id];
    else next[id] = '';
    return next;
  });

  const toggleAll = () => setSelected(sel =>
    Object.keys(sel).length === pending.length ? {} : Object.fromEntries(pending.map(r => [r.id, sel[r.id] || '']))
  );

  const selectedItems = pending.filter(r => r.id in selected);

  const handleForward = async () => {
    setSubmitting(true);
    try {
      const res = await adminReservationsAPI.forward(
        selectedItems.map(r => ({ id: r.id, note: selected[r.id].trim() }))
      );
      toast.success(res.data.message);
      setConfirmModal(false);
      setSelected({});
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Yönlendirme başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner center />;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gelen Talepler</h1>
          <p className="text-gray-500 text-sm mt-1">{admin?.camp_center_name} için gelen rezervasyon talepleri</p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2 text-sm self-start">
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {/* Yeni talepler: seç, not yaz, genel merkeze yönlendir */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Inbox size={16} className="text-primary-600" /> Yeni Talepler
              <span className="text-xs font-normal text-gray-400">({pending.length})</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Talebi incelemek veya reddetmek için detayına girin. Genel merkeze iletmek istediklerinizi seçip not ekleyebilirsiniz.
            </p>
          </div>
          {pending.length > 0 && (
            <button onClick={toggleAll} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              {Object.keys(selected).length === pending.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
            </button>
          )}
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Bekleyen yeni talep yok.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pending.map(r => {
              const isSelected = r.id in selected;
              return (
                <li key={r.id} className={`px-5 py-3 ${isSelected ? 'bg-primary-50/40' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={isSelected}
                      onChange={() => toggle(r.id)}
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggle(r.id)}>
                      <ReservationSummary r={r} />
                    </div>
                    <Link
                      to={`/admin/rezervasyonlar/${r.id}`}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0"
                    >
                      Detay <ArrowRight size={12} />
                    </Link>
                  </div>
                  {isSelected && (
                    <textarea
                      className="input-field mt-2 ml-7 text-sm"
                      style={{ width: 'calc(100% - 1.75rem)' }}
                      rows={2}
                      maxLength={300}
                      placeholder="Genel merkeze kısa not (isteğe bağlı, SMS'e eklenir)"
                      value={selected[r.id]}
                      onChange={e => setSelected(sel => ({ ...sel, [r.id]: e.target.value }))}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SimpleList
        title="Son Onay Bekleyenler"
        icon={CheckCircle}
        items={hqApproved}
        emptyText="Son onay bekleyen talep yok."
        hint="Genel merkez tarafından onaylanan talepler. Son onayı verdiğinizde başvuru sahibine belge linkiyle SMS gider."
      />

      <SimpleList
        title="Genel Merkezde Bekleyenler"
        icon={Clock}
        items={forwarded}
        emptyText="Genel merkezde bekleyen talep yok."
      />

      {/* Seçim çubuğu */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 lg:left-64 z-10 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-gray-700">{selectedItems.length} talep seçildi</span>
          <button onClick={() => setConfirmModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Send size={14} /> Genel Merkeze Yönlendir
          </button>
        </div>
      )}

      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Genel Merkeze Yönlendir" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Aşağıdaki {selectedItems.length} talep genel merkeze yönlendirilecek ve genel merkez adminlerine notlarınızla birlikte SMS gönderilecektir.
          </p>
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {selectedItems.map(r => (
              <li key={r.id} className="px-4 py-2.5 text-sm">
                <span className="font-mono font-medium text-gray-900">{r.reservation_number}</span>
                <span className="text-gray-600"> · {r.institution_name}</span>
                {selected[r.id].trim() && <p className="text-xs text-gray-500 mt-0.5">Not: {selected[r.id].trim()}</p>}
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setConfirmModal(false)} className="btn-secondary">Vazgeç</button>
            <button onClick={handleForward} disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
              Yönlendir ve SMS Gönder
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
