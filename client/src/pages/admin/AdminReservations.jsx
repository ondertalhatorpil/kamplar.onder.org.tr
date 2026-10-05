import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ArrowRight, RefreshCw, Plus } from 'lucide-react';
import { adminReservationsAPI } from '../../api';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import MobileReservationList from '../../components/common/MobileReservationList';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime, getGenderLabel } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { isHQ } from '../../utils/roles';

const STATUS_FILTERS = [
  { value: '', label: 'Tümü' },
  { value: 'PENDING', label: 'Merkez İncelemesinde' },
  { value: 'FORWARDED', label: 'Genel Merkezde' },
  { value: 'HQ_APPROVED', label: 'Son Onay Bekliyor' },
  { value: 'DOCUMENTS_PENDING', label: 'Belge Bekleniyor' },
  { value: 'DOCUMENTS_IN_REVIEW', label: 'Belge İncelemede' },
  { value: 'APPROVED', label: 'Onaylandı' },
  { value: 'REJECTED', label: 'Reddedildi' },
  { value: 'COMPLETED', label: 'Tamamlandı' },
];

const CAMP_FILTERS = [
  { value: '', label: 'Tüm Merkezler' },
  { value: '1', label: 'Bursa' },
  { value: '2', label: 'Büyükçekmece' },
];

export default function AdminReservations() {
  const { admin } = useAuth();
  const hq = isHQ(admin);
  const [reservations, setReservations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '', camp_center_id: '', group_gender: '',
    search: '', page: 1, limit: 15
  });
  const [searchInput, setSearchInput] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.camp_center_id) params.camp_center_id = filters.camp_center_id;
      if (filters.group_gender) params.group_gender = filters.group_gender;
      if (filters.search) params.search = filters.search;
      params.page = filters.page;
      params.limit = filters.limit;

      const r = await adminReservationsAPI.getAll(params);
      setReservations(r.data.data);
      setPagination(r.data.pagination);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value, page: 1 }));

  const handleSearch = (e) => {
    e.preventDefault();
    setFilter('search', searchInput);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
          <p className="text-gray-500 text-sm mt-1">Tüm rezervasyon taleplerini görüntüleyin ve yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          {hq && (
            <Link to="/admin/rezervasyonlar/manuel-ekle" className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={14} /> <span className="sm:hidden">Manuel Ekle</span><span className="hidden sm:inline">Manuel Rezervasyon Ekle</span>
            </Link>
          )}
          <button onClick={loadData} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Yenile
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input-field pl-9"
              placeholder="Rezervasyon no, ad, soyad veya telefon ara..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary text-sm">Ara</button>
          {filters.search && (
            <button type="button" onClick={() => { setSearchInput(''); setFilter('search', ''); }} className="btn-secondary text-sm">Temizle</button>
          )}
        </form>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">Durum:</span>
          </div>
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter('status', value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filters.status === value
                  ? 'bg-primary-700 text-white border-primary-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">Merkez:</span>
          </div>
          {hq && CAMP_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter('camp_center_id', value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filters.camp_center_id === value
                  ? 'bg-primary-700 text-white border-primary-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="border-l border-gray-200 pl-2 ml-1 flex gap-2">
            <button
              onClick={() => setFilter('group_gender', '')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!filters.group_gender ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-300'}`}
            >Tüm Gruplar</button>
            <button
              onClick={() => setFilter('group_gender', 'kiz')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filters.group_gender === 'kiz' ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-300'}`}
            >👩 Kız</button>
            <button
              onClick={() => setFilter('group_gender', 'erkek')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filters.group_gender === 'erkek' ? 'bg-primary-700 text-white border-primary-700' : 'bg-white text-gray-600 border-gray-300'}`}
            >👨 Erkek</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner center />
        ) : reservations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Rezervasyon bulunamadı.</p>
          </div>
        ) : (
          <>
            <MobileReservationList
              items={reservations}
              getHref={r => `/admin/rezervasyonlar/${r.id}`}
              renderBadges={r => <StatusBadge status={r.status} />}
            />
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Rezervasyon No</th>
                    <th className="px-4 py-3 text-left">Yetkili</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Telefon</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Kamp Merkezi</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Katılımcı</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Grup</th>
                    <th className="px-4 py-3 text-left hidden xl:table-cell">Giriş Tarihi</th>
                    <th className="px-4 py-3 text-left">Durum</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reservations.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{r.reservation_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{r.authorized_first_name} {r.authorized_last_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{r.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{r.campCenter?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{r.participant_count} kişi</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{getGenderLabel(r.group_gender)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden xl:table-cell">{formatDateTime(r.start_datetime)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/rezervasyonlar/${r.id}`}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                          İncele <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={pagination}
              onPageChange={(p) => setFilters(f => ({ ...f, page: p }))}
            />
          </>
        )}
      </div>
    </div>
  );
}
