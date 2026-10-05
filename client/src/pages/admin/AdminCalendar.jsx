import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users, MapPin, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { adminCalendarAPI } from '../../api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { getStatusLabel } from '../../utils/helpers';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Fixed, CVD-safe categorical order — identity (camp center) is carried by
// this color; reservation status is carried separately (border/opacity) so
// the two dimensions never collide on the same chip.
const CAMP_CENTER_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'];

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [capacityData, setCapacityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    setLoading(true);
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    try {
      const [calR, capR] = await Promise.all([
        adminCalendarAPI.getCalendar({ start_date: start, end_date: end }),
        adminCalendarAPI.getCapacity({ date: format(new Date(), 'yyyy-MM-dd') })
      ]);
      setReservations(calR.data.data);
      setCapacityData(capR.data.data);
    } catch {}
    setLoading(false);
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (startOfMonth(currentMonth).getDay() + 6) % 7; // Mon=0

  const getReservationsForDay = (day) => {
    return reservations.filter(r => {
      const start = new Date(r.start_datetime);
      const end = new Date(r.end_datetime);
      const d = new Date(day);
      d.setHours(12, 0, 0, 0);
      return d >= new Date(start.toDateString()) && d <= new Date(end.toDateString());
    }).filter(r => !filter || r.camp_center_id === parseInt(filter));
  };

  const selectedDayReservations = selectedDay ? getReservationsForDay(selectedDay) : [];

  const sortedCenters = [...capacityData].sort((a, b) => a.camp_center.id - b.camp_center.id);
  const getCampCenterColor = (campCenterId) => {
    const idx = sortedCenters.findIndex(c => c.camp_center.id === campCenterId);
    return CAMP_CENTER_COLORS[idx >= 0 ? idx % CAMP_CENTER_COLORS.length : 0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rezervasyon Takvimi</h1>
        <p className="text-gray-500 text-sm mt-1">Onaylanan ve bekleyen rezervasyonları takvimde görüntüleyin</p>
      </div>

      {/* Capacity summary */}
      {capacityData.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {capacityData.map(c => (
            <div key={c.camp_center.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-primary-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">{c.camp_center.name}</h3>
                </div>
                <span className="text-sm font-bold text-gray-900">{c.usage_percent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all ${c.usage_percent > 80 ? 'bg-red-500' : c.usage_percent > 50 ? 'bg-orange-400' : 'bg-green-500'}`}
                  style={{ width: `${c.usage_percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Kullanılan: <strong className="text-gray-800">{c.used_capacity} kişi</strong></span>
                <span>Kalan: <strong className="text-gray-800">{c.remaining_capacity} kişi</strong></span>
                <span>Toplam: <strong className="text-gray-800">{c.total_capacity} kişi</strong></span>
              </div>
              {c.pending_reservations > 0 && (
                <p className="text-xs text-orange-600 mt-2">⚠️ {c.pending_reservations} bekleyen talep ({c.pending_capacity} kişi)</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: tr })}
            </h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Filter */}
          <div className="px-6 pt-4 flex gap-2">
            {[{ v: '', l: 'Tümü' }, { v: '1', l: 'Bursa' }, { v: '2', l: 'Büyükçekmece' }].map(f => (
              <button key={f.v} onClick={() => setFilter(f.v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === f.v ? 'bg-primary-700 text-white border-primary-700' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                {f.l}
              </button>
            ))}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-4 pt-4 pb-2">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>

          {/* Days */}
          {loading ? <LoadingSpinner center /> : (
            <div className="grid grid-cols-7 gap-0 px-4 pb-4">
              {Array(firstDayOfWeek).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {days.map(day => {
                const dayRes = getReservationsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[72px] p-1.5 border border-gray-100 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary-50 border-primary-300'
                      : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-primary-700 text-white' : 'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayRes.slice(0, 3).map(r => (
                        <div
                          key={r.id}
                          style={{ backgroundColor: getCampCenterColor(r.camp_center_id) }}
                          className={classNames(
                            'text-xs px-1 py-0.5 rounded text-white truncate',
                            ['PENDING', 'FORWARDED', 'HQ_APPROVED'].includes(r.status) && 'border-2 border-dashed border-white',
                            r.status === 'REJECTED' && 'opacity-50 line-through',
                            r.status === 'CANCELLED' && 'opacity-40 grayscale'
                          )}
                          title={`${r.campCenter?.name} · ${getStatusLabel(r.status)} · ${r.authorized_first_name} ${r.authorized_last_name} - ${r.participant_count} kişi`}
                        >
                          {r.participant_count}k
                        </div>
                      ))}
                      {dayRes.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">+{dayRes.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="px-6 pb-4 space-y-2">
            <div className="flex flex-wrap gap-3">
              {sortedCenters.map(c => (
                <div key={c.camp_center.id} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: getCampCenterColor(c.camp_center.id) }} />
                  {c.camp_center.name}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-3 h-3 rounded border-2 border-dashed border-gray-400" />
                Beklemede
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-3 h-3 rounded bg-gray-300 opacity-60" />
                Reddedildi / İptal
              </div>
            </div>
          </div>
        </div>

        {/* Day detail */}
        <div className="card p-5">
          {selectedDay ? (
            <>
              <h3 className="font-semibold text-gray-900 mb-4">
                {format(selectedDay, 'd MMMM yyyy', { locale: tr })}
              </h3>
              {selectedDayReservations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Bu günde rezervasyon yok.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayReservations.map(r => (
                    <Link
                      key={r.id}
                      to={`/admin/rezervasyonlar/${r.id}`}
                      style={{ borderLeftColor: getCampCenterColor(r.camp_center_id) }}
                      className="block p-3 rounded-xl border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-mono text-gray-500">{r.reservation_number}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        {r.authorized_first_name} {r.authorized_last_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users size={11} /> {r.participant_count} kişi</span>
                        <span className="flex items-center gap-1"><MapPin size={11} /> {r.campCenter?.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span><Clock size={10} className="inline mr-0.5" />{format(new Date(r.start_datetime), 'HH:mm')} – {format(new Date(r.end_datetime), 'HH:mm')}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">Detayları görmek için takvimden bir gün seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
