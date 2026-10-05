import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { adminDocumentsAPI } from '../../api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import MobileReservationList from '../../components/common/MobileReservationList';
import { formatDateTime, getDocStatusLabel } from '../../utils/helpers';

function DocBadge({ status }) {
  const map = {
    NOT_UPLOADED: 'bg-orange-100 text-orange-700',
    UPLOADED: 'bg-rose-100 text-rose-700',
    VALIDATED: 'bg-green-100 text-green-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    ERROR: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {getDocStatusLabel(status)}
    </span>
  );
}

export default function AdminDocuments() {
  const [docs, setDocs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminDocumentsAPI.getAll({ page, limit: 15, search: search || undefined });
      setDocs(r.data.data);
      setPagination(r.data.pagination);
    } catch {}
    setLoading(false);
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rezervasyon Belgeleri</h1>
        <p className="text-gray-500 text-sm mt-1">Onaylanan rezervasyonların belge durumlarını görüntüleyin</p>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Rezervasyon no veya yetkili adı ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary text-sm">Ara</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingSpinner center /> : docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Belge bulunamadı.</div>
        ) : (
          <>
            <MobileReservationList
              items={docs}
              getHref={r => `/admin/belgeler/${r.id}`}
              renderBadges={r => (
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">Liste: <DocBadge status={r.participant_file_status} /></span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">Taahhüt: <DocBadge status={r.commitment_status} /></span>
                  {r.needs_parental_consent && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">Muvafakat: <DocBadge status={r.consent_status} /></span>
                  )}
                </>
              )}
            />
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Rezervasyon No</th>
                    <th className="px-4 py-3 text-left">Yetkili</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Kamp Merkezi</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Katılımcı</th>
                    <th className="px-4 py-3 text-left">Katılımcı Listesi</th>
                    <th className="px-4 py-3 text-left">Taahhütname</th>
                    <th className="px-4 py-3 text-left">Veli Muvafakat</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {docs.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{r.reservation_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.authorized_first_name} {r.authorized_last_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{r.campCenter?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{r.participant_count} kişi</td>
                      <td className="px-4 py-3"><DocBadge status={r.participant_file_status} /></td>
                      <td className="px-4 py-3"><DocBadge status={r.commitment_status} /></td>
                      <td className="px-4 py-3">
                        {r.needs_parental_consent ? <DocBadge status={r.consent_status} /> : <span className="text-xs text-gray-400">Gerekmiyor</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/belgeler/${r.id}`}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                          Detay <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
