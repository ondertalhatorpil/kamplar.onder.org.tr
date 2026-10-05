import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { eachDayOfInterval, format } from 'date-fns';
import { campCentersAPI, adminReservationsAPI } from '../../api';

// Same field set/labels as the public reservation form (ReservationPage.jsx),
// minus check-in/check-out time — this is an admin data-entry tool, not a
// booking wizard, so only the date (not time) needs to be picked.
const GROUP_COMPOSITION_OPTIONS = [
  { value: 'male_only', label: 'Beyefendi' },
  { value: 'female_only', label: 'Hanımefendi' },
];

const EDUCATION_LEVEL_OPTIONS = [
  { value: 'ilkokul', label: 'İlkokul' },
  { value: 'ortaokul', label: 'Ortaokul' },
  { value: 'lise', label: 'Lise' },
  { value: 'universite', label: 'Üniversite' },
  { value: 'diger', label: 'Diğer' },
];

const DEFAULT_CHECK_IN_TIME = '09:00';
const DEFAULT_CHECK_OUT_TIME = '18:00';

const INITIAL_DATA = {
  camp_center_id: '',
  start_date: '',
  end_date: '',
  participant_count: 10,
  group_composition: '',
  education_level: '',
  has_minors: false,
  purpose: '',
  authorized_first_name: '',
  authorized_last_name: '',
  authorized_role: '',
  phone: '',
  email: '',
  institution_name: '',
  province: '',
  district: '',
  description: '',
  meal_breakfast: false,
  meal_dinner: false,
};

export default function AdminManualReservation() {
  const navigate = useNavigate();
  const [campCenters, setCampCenters] = useState([]);
  const [data, setData] = useState(INITIAL_DATA);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    campCentersAPI.getAll()
      .then(r => setCampCenters(r.data.data))
      .catch(() => toast.error('Kamp merkezleri yüklenemedi.'));
  }, []);

  const set = (field, value) => setData(d => ({ ...d, [field]: value }));

  const selectedCenter = campCenters.find(c => c.id === Number(data.camp_center_id));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !data.camp_center_id || !data.start_date || !data.end_date ||
      !data.participant_count || !data.group_composition || !data.education_level || !data.purpose ||
      !data.authorized_first_name || !data.authorized_last_name || !data.authorized_role ||
      !data.phone || !data.email || !data.institution_name || !data.province || !data.district
    ) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    const start_datetime = `${data.start_date}T${DEFAULT_CHECK_IN_TIME}:00`;
    const end_datetime = `${data.end_date}T${DEFAULT_CHECK_OUT_TIME}:00`;

    if (new Date(end_datetime) <= new Date(start_datetime)) {
      toast.error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır.');
      return;
    }

    let meals = [];
    if (selectedCenter && (selectedCenter.has_breakfast || selectedCenter.has_dinner)) {
      const days = eachDayOfInterval({ start: new Date(start_datetime), end: new Date(end_datetime) });
      meals = days.map(d => ({
        meal_date: format(d, 'yyyy-MM-dd'),
        breakfast_selected: data.meal_breakfast,
        dinner_selected: data.meal_dinner,
      }));
    }

    setSubmitting(true);
    try {
      const payload = {
        authorized_first_name: data.authorized_first_name,
        authorized_last_name: data.authorized_last_name,
        authorized_role: data.authorized_role,
        phone: data.phone,
        email: data.email,
        institution_name: data.institution_name,
        province: data.province,
        district: data.district,
        group_composition: data.group_composition,
        education_level: data.education_level,
        has_minors: data.has_minors,
        participant_count: parseInt(data.participant_count),
        purpose: data.purpose,
        description: data.description,
        camp_center_id: Number(data.camp_center_id),
        start_datetime,
        end_datetime,
        meals,
      };

      const response = await adminReservationsAPI.createManual(payload);
      toast.success(`Rezervasyon kaydedildi: ${response.data.data.reservation_number}`);
      navigate(`/admin/rezervasyonlar/${response.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rezervasyon kaydedilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/admin/rezervasyonlar" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manuel Rezervasyon Ekle</h1>
          <p className="text-gray-500 text-sm mt-1">
            Geçmişe veya geleceğe dönük bir rezervasyonu doğrudan sisteme kaydedin. SMS gönderilmez, rezervasyon direkt "Onaylandı" olarak kaydedilir.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Kamp Merkezi & Tarih */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Kamp Merkezi ve Tarih</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kamp Merkezi *</label>
            <select
              className="input-field"
              value={data.camp_center_id}
              onChange={e => set('camp_center_id', e.target.value)}
            >
              <option value="" disabled>Seçiniz</option>
              {campCenters.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
              ))}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Giriş Tarihi *</label>
              <input
                type="date"
                className="input-field"
                value={data.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Çıkış Tarihi *</label>
              <input
                type="date"
                className="input-field"
                value={data.end_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">Geçmiş tarihler girilebilir — geçmiş veriyi sisteme işlemek için kullanılır.</p>

          {selectedCenter && (selectedCenter.has_breakfast || selectedCenter.has_dinner) && (
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Yemek (tüm günler için)</label>
              <div className="flex gap-6">
                {selectedCenter.has_breakfast && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" checked={data.meal_breakfast} onChange={e => set('meal_breakfast', e.target.checked)} />
                    Kahvaltı
                  </label>
                )}
                {selectedCenter.has_dinner && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" checked={data.meal_dinner} onChange={e => set('meal_dinner', e.target.checked)} />
                    Akşam Yemeği
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grup Bilgisi */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Grup Bilgisi</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Katılımcı Sayısı *</label>
            <input
              type="number"
              min={1}
              className="input-field max-w-[10rem]"
              value={data.participant_count}
              onChange={e => set('participant_count', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cinsiyet Belirleme *</label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {GROUP_COMPOSITION_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => set('group_composition', opt.value)}
                  className={`p-2.5 rounded-lg border-2 text-center font-medium text-sm ${
                    data.group_composition === opt.value ? 'bg-primary-50 border-primary-600 text-primary-700' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Öğrenim Durumu *</label>
            <select className="input-field" value={data.education_level} onChange={e => set('education_level', e.target.value)}>
              <option value="" disabled>Seçiniz</option>
              {EDUCATION_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {data.education_level === 'diger' && (
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={data.has_minors} onChange={e => set('has_minors', e.target.checked)} />
                Grupta 18 yaş altı katılımcı var
              </label>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kampın Amacı (Kısaca) *</label>
            <input type="text" className="input-field" value={data.purpose} onChange={e => set('purpose', e.target.value)} placeholder="Örn: Yaz okulu, Liderlik eğitimi" />
          </div>
        </div>

        {/* Yetkili / İletişim Bilgisi */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900">Yetkili / İletişim Bilgisi</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ad *</label>
              <input type="text" className="input-field" value={data.authorized_first_name} onChange={e => set('authorized_first_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Soyad *</label>
              <input type="text" className="input-field" value={data.authorized_last_name} onChange={e => set('authorized_last_name', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kurum Bilgisi *</label>
            <input type="text" className="input-field" value={data.institution_name} onChange={e => set('institution_name', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">İl *</label>
              <input type="text" className="input-field" value={data.province} onChange={e => set('province', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">İlçe *</label>
              <input type="text" className="input-field" value={data.district} onChange={e => set('district', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Görevi / Unvanı *</label>
            <input type="text" className="input-field" value={data.authorized_role} onChange={e => set('authorized_role', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon Numarası *</label>
              <input type="tel" className="input-field" value={data.phone} onChange={e => set('phone', e.target.value)} placeholder="05XX XXX XX XX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-posta Adresi *</label>
              <input type="email" className="input-field" value={data.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Açıklama */}
        <div className="card p-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ek Notlarınız (isteğe bağlı)</label>
          <textarea className="input-field" rows={3} value={data.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Sisteme Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
