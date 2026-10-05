import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, CheckCircle, Clock, XCircle, FileText, Users,
  MapPin, TrendingUp, ArrowRight, LogIn, LogOut, AlertCircle
} from 'lucide-react';
import { adminDashboardAPI } from '../../api';
import StatusBadge from '../../components/common/StatusBadge';
import MobileReservationList from '../../components/common/MobileReservationList';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime, getGenderLabel } from '../../utils/helpers';

function StatCard({ icon: Icon, label, value, color = 'primary', sub }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700',
    orange: 'bg-orange-50 text-orange-700', // pending — matches status semantics elsewhere
    green: 'bg-green-50 text-green-700', // approved — matches status semantics elsewhere
    red: 'bg-red-50 text-red-700', // rejected — matches status semantics elsewhere
    blue: 'bg-rose-50 text-rose-700',
    purple: 'bg-red-100 text-red-800',
    amber: 'bg-rose-100 text-rose-800',
    gray: 'bg-gray-50 text-gray-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminDashboardAPI.get().then(r => {
      setData(r.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner center />;
  if (!data) return <div className="text-center text-gray-500 py-12">Veri yüklenemedi.</div>;

  const { summary, today_check_in, today_check_out, recent_reservations } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">ÖnderKamp rezervasyon sistemi genel bakış</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Toplam Başvuru" value={summary.total} color="blue" />
        <StatCard icon={Clock} label="Bekleyen Başvuru" value={summary.pending} color="orange" />
        <StatCard icon={CheckCircle} label="Onaylanan" value={summary.approved} color="green" />
        <StatCard icon={XCircle} label="Reddedilen" value={summary.rejected} color="red" />
        <StatCard icon={FileText} label="Belge Bekleyen" value={summary.document_pending} color="amber" />
        <StatCard icon={FileText} label="Belgeler Tamamlanan" value={summary.document_complete} color="primary" />
        <StatCard icon={MapPin} label="Bursa Rezervasyon" value={summary.bursa} color="purple" />
        <StatCard icon={MapPin} label="Büyükçekmece Rezervasyon" value={summary.buyukcekmece} color="gray" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Bu Ay Konaklayacak" value={`${summary.this_month_participants} kişi`} color="blue" />
        <StatCard icon={LogIn} label="Bugün Giriş" value={today_check_in?.length ?? 0} color="green" sub="grup" />
        <StatCard icon={LogOut} label="Bugün Çıkış" value={today_check_out?.length ?? 0} color="orange" sub="grup" />
      </div>

      {/* Today check-in/out */}
      {(today_check_in?.length > 0 || today_check_out?.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {today_check_in?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <LogIn size={16} className="text-green-600" /> Bugün Giriş Yapacak Gruplar
              </h3>
              <div className="space-y-2">
                {today_check_in.map(r => (
                  <Link key={r.id} to={`/admin/rezervasyonlar/${r.id}`}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.authorized_first_name} {r.authorized_last_name}</p>
                      <p className="text-xs text-gray-500">{r.campCenter?.name} · {r.participant_count} kişi</p>
                    </div>
                    <p className="text-xs text-green-700 font-medium">{new Date(r.start_datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {today_check_out?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <LogOut size={16} className="text-orange-600" /> Bugün Çıkış Yapacak Gruplar
              </h3>
              <div className="space-y-2">
                {today_check_out.map(r => (
                  <Link key={r.id} to={`/admin/rezervasyonlar/${r.id}`}
                    className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.authorized_first_name} {r.authorized_last_name}</p>
                      <p className="text-xs text-gray-500">{r.campCenter?.name} · {r.participant_count} kişi</p>
                    </div>
                    <p className="text-xs text-orange-700 font-medium">{new Date(r.end_datetime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent reservations */}
      <div className="card">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Son Rezervasyon Talepleri</h3>
          <Link to="/admin/rezervasyonlar" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 whitespace-nowrap">
            Tümünü Gör <ArrowRight size={14} />
          </Link>
        </div>
        <MobileReservationList
          items={recent_reservations || []}
          getHref={r => `/admin/rezervasyonlar/${r.id}`}
          renderBadges={r => <StatusBadge status={r.status} />}
        />
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Rezervasyon No</th>
                <th className="px-4 py-3 text-left">Yetkili</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Kamp Merkezi</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Katılımcı</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Grup</th>
                <th className="px-4 py-3 text-left">Durum</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent_reservations?.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{r.reservation_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.authorized_first_name} {r.authorized_last_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{r.campCenter?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{r.participant_count} kişi</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{getGenderLabel(r.group_gender)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/rezervasyonlar/${r.id}`} className="text-primary-600 hover:text-primary-700">
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
