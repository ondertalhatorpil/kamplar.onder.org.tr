import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { adminAnalyticsAPI } from '../../api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { TrendingUp, Users, MapPin, Utensils, FileText, BarChart3 } from 'lucide-react';

const COLORS = ['#8e1b1c', '#d02a2b', '#efa7a8', '#b02223', '#e47475', '#5e1213'];

function StatCard({ icon: Icon, label, value, sub, color = 'green' }) {
  const colors = {
    green: 'bg-red-50 text-red-700',
    blue: 'bg-rose-50 text-rose-700',
    amber: 'bg-red-100 text-red-800',
    purple: 'bg-rose-100 text-rose-800',
  };
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const PERIOD_OPTS = [
  { v: 'weekly', l: 'Haftalık' },
  { v: 'monthly', l: 'Aylık' },
  { v: 'custom', l: 'Özel Tarih' },
];
const CENTER_OPTS = [
  { v: '', l: 'Tüm Merkezler' },
  { v: '1', l: 'Bursa' },
  { v: '2', l: 'Büyükçekmece' },
];

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('monthly');
  const [center, setCenter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState(null);
  const [campStats, setCampStats] = useState([]);
  const [genderStats, setGenderStats] = useState([]);
  const [trends, setTrends] = useState([]);
  const [purposeStats, setPurposeStats] = useState([]);
  const [mealStats, setMealStats] = useState(null);
  const [docStats, setDocStats] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    const params = {};
    if (period !== 'custom') params.period = period;
    if (center) params.camp_center_id = center;
    if (period === 'custom' && startDate) params.start_date = startDate;
    if (period === 'custom' && endDate) params.end_date = endDate;

    try {
      const [sumR, campR, gendR, trendR, purpR, mealR, docR] = await Promise.allSettled([
        adminAnalyticsAPI.getSummary(params),
        adminAnalyticsAPI.getCampCenters(params),
        adminAnalyticsAPI.getGender(params),
        adminAnalyticsAPI.getTrends(params),
        adminAnalyticsAPI.getPurposes(params),
        adminAnalyticsAPI.getMeals(params),
        adminAnalyticsAPI.getDocuments(params),
      ]);
      if (sumR.status === 'fulfilled') setSummary(sumR.value.data.data);
      if (campR.status === 'fulfilled') setCampStats(campR.value.data.data);
      if (gendR.status === 'fulfilled') setGenderStats(gendR.value.data.data);
      if (trendR.status === 'fulfilled') setTrends(trendR.value.data.data);
      if (purpR.status === 'fulfilled') setPurposeStats(purpR.value.data.data);
      if (mealR.status === 'fulfilled') setMealStats(mealR.value.data.data);
      if (docR.status === 'fulfilled') setDocStats(docR.value.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [period, center, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analiz</h1>
        <p className="text-gray-500 text-sm mt-1">Onaylanan rezervasyonlara dayalı istatistikler</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {PERIOD_OPTS.map(o => (
            <button key={o.v} onClick={() => setPeriod(o.v)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${period === o.v ? 'bg-white shadow text-primary-700 font-medium' : 'text-gray-600'}`}>
              {o.l}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="input-field text-sm py-1.5 w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-gray-400">—</span>
            <input type="date" className="input-field text-sm py-1.5 w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        )}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg ml-auto">
          {CENTER_OPTS.map(o => (
            <button key={o.v} onClick={() => setCenter(o.v)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${center === o.v ? 'bg-white shadow text-primary-700 font-medium' : 'text-gray-600'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner center /> : (
        <>
          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={BarChart3} label="Toplam Konaklama" value={summary.total_reservations} color="blue" />
              <StatCard icon={Users} label="Toplam Katılımcı" value={summary.total_participants} color="green" />
              <StatCard icon={Users} label="Kız Katılımcı" value={summary.girl_participants} color="purple" />
              <StatCard icon={Users} label="Erkek Katılımcı" value={summary.boy_participants} color="amber" />
              <StatCard icon={MapPin} label="Bursa Konaklama" value={summary.bursa?.count} sub={`${summary.bursa?.total_participants} kişi · %${summary.bursa?.usage_percent} doluluk`} color="green" />
              <StatCard icon={MapPin} label="Büyükçekmece Konaklama" value={summary.buyukcekmece?.count} sub={`${summary.buyukcekmece?.total_participants} kişi · %${summary.buyukcekmece?.usage_percent} doluluk`} color="blue" />
              <StatCard icon={Users} label="Ort. Grup Büyüklüğü" value={`${summary.avg_group_size} kişi`} color="amber" />
              <StatCard icon={TrendingUp} label="Ort. Konaklama Süresi" value={`${summary.avg_duration} gün`} color="purple" />
            </div>
          )}

          {/* Charts grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Trend chart */}
            {trends.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Aylık Rezervasyon Trendi</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="reservations" stroke="#8e1b1c" name="Rezervasyon" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="participants" stroke="#d02a2b" name="Katılımcı" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Camp center bar chart */}
            {campStats.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Kamp Merkezine Göre Rezervasyon</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={campStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#7f1d1d" name="Rezervasyon Sayısı" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total_participants" fill="#d02a2b" name="Toplam Katılımcı" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gender pie chart */}
            {genderStats.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Kız / Erkek Dağılımı</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={genderStats.map(g => ({
                        name: g.group_gender === 'kiz' ? 'Kız' : 'Erkek',
                        value: parseInt(g.participants || g.count)
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                    >
                      {genderStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Purpose chart */}
            {purposeStats.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Kullanım Amacı Dağılımı</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={purposeStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="purpose" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#b91c1c" name="Rezervasyon" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Meal and document stats */}
          <div className="grid sm:grid-cols-2 gap-4">
            {mealStats && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Utensils size={16} className="text-primary-600" /> Yemek Tercihi Dağılımı
                </h3>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={[
                    { name: 'Kahvaltı', value: mealStats.breakfast },
                    { name: 'Akşam Yemeği', value: mealStats.dinner }
                  ]}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#b91c1c" name="Tercih Sayısı" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {docStats && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-primary-600" /> Belge Tamamlanma Durumu
                </h3>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Tamamlanan', value: docStats.complete },
                        { name: 'Eksik', value: docStats.incomplete }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill="#7f1d1d" />
                      <Cell fill="#fca5a5" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Purpose breakdown table */}
          {summary?.purpose_distribution?.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">En Çok Tercih Edilen Kullanım Amaçları</h3>
              <div className="space-y-2">
                {summary.purpose_distribution.map((p, i) => (
                  <div key={p.purpose} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-gray-700">{p.purpose}</span>
                      <span className="text-sm font-semibold text-gray-900">{p.count} rezervasyon</span>
                    </div>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary-600"
                        style={{ width: `${Math.min(100, (p.count / summary.total_reservations) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
