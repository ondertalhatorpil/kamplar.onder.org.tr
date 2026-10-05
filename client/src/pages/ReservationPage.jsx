import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { tr } from 'date-fns/locale';
import { format, eachDayOfInterval } from 'date-fns';
import { MapPin, Users, Minus, Plus, Info, ArrowLeft, ArrowRight, Check, Lock, Send, Building2, ChevronDown, Paperclip, X } from 'lucide-react';
import { reservationsAPI, campCentersAPI } from '../api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { PROVINCE_NAMES, PROVINCES_DISTRICTS } from '../data/turkeyProvinces';

// Sunucudaki uploadProgramFile filtresiyle aynı liste
const PROGRAM_FILE_ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png';
const PROGRAM_FILE_MAX_SIZE = 10 * 1024 * 1024;

// SMS gönderilebilecek cep telefonu: 05XX XXX XX XX (sunucudaki isValidMobilePhone ile aynı)
const isValidMobilePhone = (phone) => /^(90|0)?5\d{9}$/.test(String(phone || '').replace(/\D/g, ''));
import { CAMP_RULES } from '../data/campRules';

const INITIAL_DATA = {
  authorized_first_name: '',
  authorized_last_name: '',
  authorized_role: '',
  phone: '',
  email: '',
  institution_name: '',
  province: '',
  district: '',
  group_composition: '', // 'female_only', 'male_only'
  education_level: '', // 'ilkokul', 'ortaokul', 'lise', 'universite', 'diger'
  has_minors: false, // yalnızca "diğer" seçildiğinde sorulur
  check_in_time: '09:00',
  check_out_time: '18:00',
  camp_center_id: null,
  participant_count: 10,
  purpose: '',
  meals: {},
  description: '',
};

// Check-in/out times are offered as whole hours only, 09:00–20:00.
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`);

const STEPS = [
  { title: 'Kamp Merkezi Seçimi', subtitle: 'Konaklayacağınız merkezi seçin' },
  { title: 'Tarih ve Yemek Hizmeti', subtitle: 'Konaklama tarihleri ve yemek tercihleri' },
  { title: 'Grup Bilgisi', subtitle: 'Katılımcı sayısı ve grup detayları' },
  { title: 'İletişim ve Onay', subtitle: 'Yetkili bilgileri ve rezervasyon talebi' },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Floating-label underline input (Uiverse.io / Satwinder04 style, adapted to
// the site's red accent). Floats the label up whenever the field is focused
// or already has a value, and animates a red underline in on focus.
function FloatingInput({ id, label, type = 'text', value, onChange, ...props }) {
  const [focused, setFocused] = useState(false);
  const floated = focused || String(value ?? '').length > 0;

  return (
    <div className="relative pt-4">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="peer w-full border-0 border-b-2 border-gray-300 bg-transparent px-0 py-2 text-gray-900 focus:outline-none focus:ring-0"
        {...props}
      />
      <label
        htmlFor={id}
        className={classNames(
          'absolute left-0 pointer-events-none transition-all duration-200',
          floated ? 'top-0 text-xs font-medium text-red-600' : 'top-6 text-base text-gray-400'
        )}
      >
        {label}
      </label>
      <span
        className={classNames(
          'pointer-events-none absolute left-0 bottom-0 h-0.5 bg-red-600 transition-all duration-300',
          focused ? 'w-full' : 'w-0'
        )}
      />
    </div>
  );
}

// Custom dropdown (Uiverse.io / gharsh11032000 "menu" style, adapted to the
// site's red accent and to click-to-open rather than hover, since this
// stands in for a real <select>).
function CustomSelect({ id, value, onChange, options, placeholder = 'Seçiniz', disabled = false, searchable = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onClickOutside = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  // Turkish-aware case folding, so typing "istanbul" (plain ASCII i) matches
  // "İstanbul": the default (locale-less) toLowerCase() turns "İ" into "i̇"
  // (a plain i plus a combining dot above), which a typed "i" never equals.
  const normalize = (s) => s.toLocaleLowerCase('tr-TR');
  const visibleOptions = searchable && query
    ? options.filter(o => normalize(o.label).includes(normalize(query)))
    : options;

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    if (searchable) {
      setOpen(true);
      inputRef.current?.focus();
    } else {
      setOpen(o => !o);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div
        onClick={handleTriggerClick}
        className={classNames(
          'w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border-2 border-red-600 text-sm sm:text-base font-medium transition-all duration-300',
          disabled ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'cursor-pointer',
          !disabled && (open ? (searchable ? 'bg-white text-gray-900 rounded-b-none' : 'bg-red-600 text-white rounded-b-none') : 'bg-white text-gray-900 hover:bg-red-50')
        )}
      >
        {searchable ? (
          <input
            ref={inputRef}
            id={id}
            type="text"
            disabled={disabled}
            value={open ? query : (selected ? selected.label : '')}
            placeholder={placeholder}
            onFocus={() => { setOpen(true); setQuery(''); }}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && visibleOptions.length > 0) {
                e.preventDefault();
                handleSelect(visibleOptions[0]);
              }
            }}
            className="flex-1 min-w-0 bg-transparent outline-none placeholder-gray-400 text-gray-900"
          />
        ) : (
          <span id={id} className={classNames(!selected && (open ? 'text-white/70' : 'text-gray-400'))}>
            {selected ? selected.label : placeholder}
          </span>
        )}
        <ChevronDown size={16} className={classNames('transition-transform duration-300 flex-shrink-0', open && 'rotate-180')} />
      </div>

      {open && (
        <div className="absolute z-20 top-full left-0 w-full flex flex-col max-h-64 overflow-y-auto rounded-b-2xl border-2 border-t-0 border-red-600 bg-white shadow-lg">
          {visibleOptions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 text-center">Sonuç bulunamadı</p>
          ) : visibleOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt)}
              className={classNames(
                'w-full px-4 py-2.5 text-sm sm:text-base text-gray-700 hover:bg-red-600 hover:text-white transition-colors duration-300',
                searchable ? 'text-left' : 'text-center'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Custom checkbox (Uiverse.io / bociKond style, red variant, styles in index.css)
function Checkbox({ checked, onChange, disabled, label, title }) {
  return (
    <label
      className={classNames('checkbox-container p-2 rounded-lg whitespace-nowrap', disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer')}
      title={title}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="checkmark" />
      {label && <span className="text-sm whitespace-nowrap">{label}</span>}
    </label>
  );
}

export default function ReservationPage() {
  const navigate = useNavigate();
  // Every reservation starts from a completely blank form — no draft is
  // persisted or restored, so a new visit (or a refresh) never comes back
  // with previously entered group info, dates, or anything else pre-filled.
  const [data, setData] = useState(INITIAL_DATA);
  const [range, setRange] = useState(undefined);
  // Tek gün seçildiğinde (bitiş seçilmediğinde) konaklama aynı gün biter.
  const rangeEnd = range?.to ?? range?.from;
  const isSingleDay = !!range?.from && format(range.from, 'yyyy-MM-dd') === format(rangeEnd, 'yyyy-MM-dd');
  // Aynı gün giriş-çıkışta çıkış saati girişten sonra olmalı (saatler "HH:00" biçiminde).
  const invalidSingleDayTimes = isSingleDay && data.check_out_time <= data.check_in_time;
  const [confirmed, setConfirmed] = useState(false);
  const [programFile, setProgramFile] = useState(null);
  const programFileInputRef = useRef(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [campCenters, setCampCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    campCentersAPI.getAll()
      .then(r => setCampCenters(r.data.data))
      .catch(() => toast.error("Kamp merkezleri yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);


  const set = (field, value) => {
    setData(prevData => ({ ...prevData, [field]: value }));
  };

  // Single source of truth for step completeness — drives the sidebar
  // checkmarks, which steps are unlocked, and the submit gate.
  const isStepComplete = (step) => {
    switch (step) {
      case 1:
        return !!data.camp_center_id;
      case 2:
        return !!range?.from && !!data.check_in_time && !!data.check_out_time && !invalidSingleDayTimes;
      case 3:
        return !!data.participant_count && !!data.group_composition && !!data.education_level && !!data.purpose;
      case 4:
        return !!data.authorized_first_name && !!data.authorized_last_name && !!data.authorized_role && isValidMobilePhone(data.phone) && !!data.email &&
          !!data.institution_name && !!data.province && !!data.district;
      default:
        return false;
    }
  };

  // A step can only be reached once every step before it is complete —
  // this is the hard gate the user asked for ("1. adım bitmeden diğer
  // adımlara geçilmeyecek").
  const canGoToStep = (step) => {
    for (let s = 1; s < step; s++) {
      if (!isStepComplete(s)) return false;
    }
    return true;
  };

  const goToStep = (step) => {
    if (canGoToStep(step)) {
      setActiveStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goNext = () => {
    if (isStepComplete(activeStep) && activeStep < STEPS.length) goToStep(activeStep + 1);
  };

  const goBack = () => {
    if (activeStep > 1) goToStep(activeStep - 1);
  };

  const selectedCenter = campCenters.find(c => c.id === data.camp_center_id);
  const maxParticipants = selectedCenter?.capacity || 100;

  const clampParticipantCount = (value) => {
    const n = parseInt(value);
    if (isNaN(n)) return 10;
    return Math.min(maxParticipants, Math.max(10, n));
  };

  const mealDays = range?.from ? eachDayOfInterval({ start: range.from, end: rangeEnd }).map(d => format(d, 'yyyy-MM-dd')) : [];

  // Breakfast on the arrival day is only available if the group checks in
  // right at 09:00 — the breakfast window (08:00–10:00) is otherwise already
  // over or nearly over by the time they arrive. Every later day is a full
  // morning on-site, so it's unaffected.
  const canSelectBreakfast = (dateStr) => mealDays[0] !== dateStr || data.check_in_time === '09:00';

  // Whenever the check-in time or date range changes such that the arrival
  // day's breakfast is no longer eligible, clear any stale selection.
  useEffect(() => {
    const firstDay = mealDays[0];
    if (!firstDay || canSelectBreakfast(firstDay)) return;
    if (!data.meals?.[firstDay]?.breakfast) return;
    setData(prevData => ({
      ...prevData,
      meals: { ...prevData.meals, [firstDay]: { ...prevData.meals[firstDay], breakfast: false } }
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.check_in_time, range?.from, rangeEnd]);

  const handleMealChange = (dateStr, mealType, checked) => {
    if (mealType === 'breakfast' && !canSelectBreakfast(dateStr)) return;
    const currentMeals = data.meals || {};
    const dayMeals = currentMeals[dateStr] || { breakfast: false, dinner: false };
    setData({
      ...data,
      meals: {
        ...currentMeals,
        [dateStr]: { ...dayMeals, [mealType]: checked }
      }
    });
  };

  const isMealSelectedAllDays = (mealType) => {
    const eligibleDays = mealType === 'breakfast' ? mealDays.filter(canSelectBreakfast) : mealDays;
    return eligibleDays.length > 0 && eligibleDays.every(d => data.meals?.[d]?.[mealType]);
  };

  const toggleAllMeals = (mealType) => {
    const nextValue = !isMealSelectedAllDays(mealType);
    setData(prevData => {
      const nextMeals = { ...(prevData.meals || {}) };
      mealDays.forEach(dateStr => {
        if (mealType === 'breakfast' && !canSelectBreakfast(dateStr)) return;
        const dayMeals = nextMeals[dateStr] || { breakfast: false, dinner: false };
        nextMeals[dateStr] = { ...dayMeals, [mealType]: nextValue };
      });
      return { ...prevData, meals: nextMeals };
    });
  };

  const submitDisabled = submitting || !confirmed || !isStepComplete(4);

  const handleSubmit = async () => {
    // Basic validation
    if (!data.camp_center_id || !range?.from || !data.check_in_time || !data.check_out_time ||
      !data.participant_count || !data.authorized_first_name || !data.authorized_last_name || !data.authorized_role ||
      !data.phone || !data.email || !data.institution_name || !data.province || !data.district ||
      !data.group_composition || !data.education_level || !data.purpose) {
      toast.error("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }
    if (!confirmed) {
      toast.error('Lütfen bilgilerin doğruluğunu onaylayın.');
      return;
    }

    setSubmitting(true);
    try {
      const mealsArray = Object.entries(data.meals || {}).map(([date, m]) => ({
        meal_date: date,
        breakfast_selected: m.breakfast || false,
        dinner_selected: m.dinner || false,
      }));

      const payload = {
        ...data,
        participant_count: parseInt(data.participant_count),
        camp_center_id: data.camp_center_id,
        start_datetime: `${format(range.from, 'yyyy-MM-dd')}T${data.check_in_time}:00`,
        end_datetime: `${format(rangeEnd, 'yyyy-MM-dd')}T${data.check_out_time}:00`,
        meals: mealsArray,
      };

      const response = await reservationsAPI.create(payload, programFile);

      navigate('/rezervasyon/basarili', {
        state: {
          reservation_number: response.data.data.reservation_number,
          phone: data.phone
        }
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Rezervasyon oluşturulurken hata oluştu.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const groupCompositionOptions = [
    { value: 'male_only', label: 'Beyefendi' },
    { value: 'female_only', label: 'Hanımefendi' },
  ];

  const educationLevelOptions = [
    { value: 'ilkokul', label: 'İlkokul' },
    { value: 'ortaokul', label: 'Ortaokul' },
    { value: 'lise', label: 'Lise' },
    { value: 'universite', label: 'Üniversite' },
    { value: 'diger', label: 'Diğer' },
  ];

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center"><LoadingSpinner center /></div>;
  }

  const NavButtons = ({ isLast = false }) => (
    <div className="mt-8 flex items-center justify-between pt-6">
      {activeStep > 1 ? (
        <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={16} /> Geri
        </button>
      ) : <span />}
      {!isLast && (
        <button
          type="button"
          onClick={goNext}
          disabled={!isStepComplete(activeStep)}
          className="btn-fill btn-fill-white flex items-center gap-2 bg-red-700 border-2 border-red-700 enabled:hover:text-red-700 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          Devam Et <ArrowRight size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* No page-local header — the global floating Navbar is the only
          header now, so content just leaves clearance below it. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-10 lg:pt-28 lg:pb-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mt-2 tracking-tight">Rezervasyon Talebi Oluştur</h1>
          <p className="mt-3 text-lg text-gray-500 max-w-2xl">
            Aşağıdaki 4 adımı sırasıyla tamamlayarak kamp merkezimiz için rezervasyon talebi oluşturabilirsiniz.
          </p>
        </div>

        {/* Mobile compact progress */}
        <div className="lg:hidden mb-8">
          <div className="flex items-center justify-between text-sm font-semibold text-red-800 mb-2">
            <span>Adım {activeStep}/{STEPS.length}</span>
            <span>{STEPS[activeStep - 1].title}</span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.title} className={classNames('h-1.5 flex-1 rounded-full', i + 1 <= activeStep ? 'bg-red-600' : 'bg-gray-200')} />
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left: vertical step nav (desktop) */}
          <aside className="hidden lg:block lg:w-72 flex-shrink-0">
            <div className="sticky top-40 lg:top-48">
              {STEPS.map((step, idx) => {
                const num = idx + 1;
                const complete = isStepComplete(num);
                const unlocked = canGoToStep(num);
                const active = activeStep === num;
                const isLast = idx === STEPS.length - 1;
                return (
                  <div key={step.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => goToStep(num)}
                        disabled={!unlocked}
                        className={classNames(
                          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors',
                          active ? 'bg-red-700 text-white ring-4 ring-red-100'
                            : complete ? 'bg-red-700 text-white'
                            : unlocked ? 'bg-white border-2 border-red-300 text-red-700'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        )}
                      >
                        {complete && !active ? <Check size={16} /> : !unlocked ? <Lock size={14} /> : num}
                      </button>
                      {!isLast && (
                        <div className={classNames('w-0.5 flex-1 my-1', complete ? 'bg-red-300' : 'bg-gray-200')} style={{ minHeight: '2.75rem' }} />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => goToStep(num)}
                      disabled={!unlocked}
                      className={classNames('flex-1 text-left pb-9 pt-1.5', !unlocked && 'cursor-not-allowed')}
                    >
                      <p className={classNames('font-semibold text-sm', active ? 'text-red-800' : unlocked ? 'text-gray-800' : 'text-gray-300')}>
                        {step.title}
                      </p>
                      <p className={classNames('text-xs mt-0.5', unlocked ? 'text-gray-400' : 'text-gray-300')}>{step.subtitle}</p>
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right: active step content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white p-6 sm:p-8">

              {/* Step 1: Camp Center */}
              {activeStep === 1 && (
                <div>
                  <h2 className="text-xl pt-10 font-bold text-gray-900">Size uygun kamp merkezini seçin</h2>
                  <div className="mt-6 grid sm:grid-cols-2 gap-5">
                    {campCenters.map(center => {
                      const isSelected = data.camp_center_id === center.id;
                      return (
                        <div
                          key={center.id}
                          onClick={() => set('camp_center_id', center.id)}
                          className={classNames(
                            "group relative overflow-hidden rounded-[2rem] p-6 sm:p-7 cursor-pointer transition-all duration-300 hover:scale-[0.98] active:scale-95",
                            isSelected ? "bg-red-800 ring-4 ring-red-200" : "bg-red-700 hover:bg-red-800"
                          )}
                        >
                          {/* Large decorative building icon, bleeding off the corner */}
                          <Building2
                            size={150}
                            strokeWidth={1.1}
                            className="absolute -right-5 -bottom-6 -rotate-6 text-white/10 transition-all duration-500 group-hover:scale-110 group-hover:text-white/15 pointer-events-none"
                          />

                          {isSelected && (
                            <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white text-red-700 flex items-center justify-center shadow-md">
                              <Check size={15} strokeWidth={3} />
                            </div>
                          )}

                          <div className="relative flex flex-col justify-between h-full min-h-[168px] gap-10">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                                <Building2 size={24} className="text-white" strokeWidth={1.75} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-bold text-white text-lg leading-tight">{center.name}</h3>
                                <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {center.city}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Kapasite</span>
                              <div className="flex items-center gap-1.5 bg-white/15 rounded-full pl-1.5 pr-3 py-1">
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                  <Users size={13} className="text-white" />
                                </div>
                                <span className="text-sm font-bold text-white">{center.capacity} kişi</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <NavButtons />
                </div>
              )}

              {/* Step 2: Date + Meals */}
              {activeStep === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Konaklama tarihlerini belirleyin</h2>
                  <div className="mt-6 p-4 bg-white overflow-x-auto">
                    <DayPicker
                      locale={tr}
                      mode="range"
                      selected={range}
                      onSelect={setRange}
                      numberOfMonths={2}
                      pagedNavigation
                      fromDate={new Date()}
                      disabled={{ before: new Date() }}
                      className="w-full"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4",
                        month: "space-y-4 w-full",
                        nav_button: "h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50",
                        caption_label: "text-sm font-medium text-gray-900",
                        head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-red-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-red-50",
                        day_range_start: "day-range-start",
                        day_range_end: "day-range-end",
                        day_selected: "bg-red-700 text-white hover:bg-red-800 focus:bg-red-700",
                        day_today: "bg-gray-100 text-red-700 font-semibold",
                        day_disabled: "text-gray-300",
                        day_range_middle: "aria-selected:bg-red-100 aria-selected:text-red-900",
                      }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="check_in_time" className="block text-sm font-medium text-gray-700 mb-1.5">Giriş Saati</label>
                      <CustomSelect
                        id="check_in_time"
                        value={data.check_in_time}
                        onChange={v => set('check_in_time', v)}
                        options={HOUR_OPTIONS.map(hour => ({ value: hour, label: hour }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="check_out_time" className="block text-sm font-medium text-gray-700 mb-1.5">Çıkış Saati</label>
                      <CustomSelect
                        id="check_out_time"
                        value={data.check_out_time}
                        onChange={v => set('check_out_time', v)}
                        options={HOUR_OPTIONS.map(hour => ({ value: hour, label: hour }))}
                      />
                    </div>
                  </div>
                  {invalidSingleDayTimes && (
                    <p className="mt-2 text-sm text-red-600">Aynı gün giriş ve çıkış için çıkış saati giriş saatinden sonra olmalıdır.</p>
                  )}
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-start gap-3">
                    <Info size={18} className="flex-shrink-0 mt-0.5" />
                    <span>Günübirlik kullanım için tek bir gün seçmeniz yeterlidir. Seçtiğiniz tarihlerdeki doluluk durumu, talebiniz sonrasında kamp yetkilileri tarafından kontrol edilecek ve size SMS ile bilgi verilecektir.</span>
                  </div>

                  {selectedCenter && mealDays.length > 0 && (selectedCenter.has_breakfast || selectedCenter.has_dinner) && (
                    <div className="mt-6 p-6 bg-white">
                      <h3 className="text-lg font-semibold text-gray-800">Yemek Seçimleri</h3>
                      <p className="text-sm text-gray-500 mb-4">Her gün için yemek tercihinizi belirtebilirsiniz. Seçim zorunlu değildir.</p>

                      <div className="flex gap-2 mb-4">
                        {selectedCenter.has_breakfast && (
                          <button
                            type="button"
                            onClick={() => toggleAllMeals('breakfast')}
                            className={classNames(
                              'flex-1 min-w-0 px-2 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors text-center leading-tight',
                              isMealSelectedAllDays('breakfast')
                                ? 'bg-red-700 text-white border-red-700'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            Kahvaltı: {isMealSelectedAllDays('breakfast') ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                          </button>
                        )}
                        {selectedCenter.has_dinner && (
                          <button
                            type="button"
                            onClick={() => toggleAllMeals('dinner')}
                            className={classNames(
                              'flex-1 min-w-0 px-2 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors text-center leading-tight',
                              isMealSelectedAllDays('dinner')
                                ? 'bg-red-700 text-white border-red-700'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            Akşam Yemeği: {isMealSelectedAllDays('dinner') ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                          </button>
                        )}
                      </div>

                      <div>
                        <div className="grid divide-y divide-gray-100">
                          {mealDays.map(dateStr => (
                            <div
                              key={dateStr}
                              className={classNames(
                                'flex flex-col gap-2 p-3',
                                'sm:grid sm:items-center sm:gap-2',
                                selectedCenter.has_dinner ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                              )}
                            >
                              <div className="text-sm font-medium text-gray-700 whitespace-nowrap">{format(new Date(dateStr), 'd MMMM, EEEE', { locale: tr })}</div>

                              <div className="flex items-center gap-4 sm:contents">
                                {selectedCenter.has_breakfast && (
                                  <Checkbox
                                    label="Kahvaltı"
                                    checked={(canSelectBreakfast(dateStr) && data.meals?.[dateStr]?.breakfast) || false}
                                    disabled={!canSelectBreakfast(dateStr)}
                                    onChange={e => handleMealChange(dateStr, 'breakfast', e.target.checked)}
                                    title={canSelectBreakfast(dateStr) ? undefined : 'Kahvaltı yalnızca 09:00 girişte mevcuttur'}
                                  />
                                )}

                                {selectedCenter.has_dinner && (
                                  <Checkbox
                                    label="Akşam Yemeği"
                                    checked={data.meals?.[dateStr]?.dinner || false}
                                    onChange={e => handleMealChange(dateStr, 'dinner', e.target.checked)}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <NavButtons />
                </div>
              )}

              {/* Step 3: Group */}
              {activeStep === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Grup bilgilerinizi paylaşın</h2>
                  <div className="mt-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Katılımcı Sayısı</label>
                      <div className="flex items-center gap-4">
                        <div className="relative flex items-center max-w-[8rem]">
                          <button
                            type="button"
                            onClick={() => set('participant_count', clampParticipantCount(data.participant_count - 1))}
                            className="bg-red-50 hover:bg-red-100 border border-red-300 rounded-s-lg p-3 h-11 flex-shrink-0 focus:ring-2 focus:ring-red-200 focus:outline-none"
                          >
                            <Minus size={12} className="text-red-700" />
                          </button>
                          <input
                            type="number"
                            min={10}
                            max={maxParticipants}
                            value={data.participant_count}
                            onChange={e => set('participant_count', e.target.value === '' ? '' : parseInt(e.target.value))}
                            onBlur={e => set('participant_count', clampParticipantCount(e.target.value))}
                            className="border-x-0 border-y border-red-300 h-11 w-full text-center text-gray-900 font-semibold text-sm py-2.5 focus:ring-1 focus:ring-red-500 focus:border-red-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => set('participant_count', clampParticipantCount(data.participant_count + 1))}
                            className="bg-red-50 hover:bg-red-100 border border-red-300 rounded-e-lg p-3 h-11 flex-shrink-0 focus:ring-2 focus:ring-red-200 focus:outline-none"
                          >
                            <Plus size={12} className="text-red-700" />
                          </button>
                        </div>
                        <span className="text-sm text-gray-500">Min: 10, Maks: {selectedCenter?.capacity || 'N/A'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cinsiyet Belirleme</label>
                      <div className="relative flex items-center h-[50px] w-full max-w-sm rounded-full border-2 border-red-600 p-1 overflow-hidden">
                        <span
                          aria-hidden="true"
                          className={classNames(
                            'absolute top-1 left-1 bottom-1 w-[calc(50%-0.35rem)] rounded-full bg-red-600 transition-all duration-500 ease-out',
                            !data.group_composition && 'opacity-0',
                            data.group_composition === groupCompositionOptions[1].value && 'translate-x-[calc(100%+0.25rem)]'
                          )}
                        />
                        {groupCompositionOptions.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => set('group_composition', opt.value)}
                            className={classNames(
                              'relative z-10 flex-1 h-full rounded-full text-sm sm:text-base transition-colors duration-500',
                              data.group_composition === opt.value ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1.5">Öğrenim Durumu</label>
                      <CustomSelect
                        id="education_level"
                        value={data.education_level}
                        onChange={v => set('education_level', v)}
                        options={educationLevelOptions}
                      />
                      {data.education_level === 'diger' && (
                        <label className="mt-2 flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                            checked={data.has_minors}
                            onChange={e => set('has_minors', e.target.checked)}
                          />
                          <span className="text-sm text-gray-700">Grupta 18 yaş altı katılımcı var</span>
                        </label>
                      )}
                      {(['ilkokul', 'ortaokul', 'lise'].includes(data.education_level) || (data.education_level === 'diger' && data.has_minors)) && (
                        <p className="text-xs text-gray-500 mt-1.5">
                          Rezervasyon onaylandıktan sonra belge yükleme aşamasında her katılımcı için imzalı veli muvafakatnamesi istenecektir.
                        </p>
                      )}
                    </div>
                    <FloatingInput id="purpose" label="Kampın Amacı (Kısaca)" value={data.purpose} onChange={e => set('purpose', e.target.value)} />
                  </div>
                  <NavButtons />
                </div>
              )}

              {/* Step 4: Contact + Description + Submit */}
              {activeStep === 4 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Yetkili kişi bilgilerini girin</h2>
                  <div className="mt-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-x-4">
                      <FloatingInput id="authorized_first_name" label="Ad" value={data.authorized_first_name} onChange={e => set('authorized_first_name', e.target.value)} />
                      <FloatingInput id="authorized_last_name" label="Soyad" value={data.authorized_last_name} onChange={e => set('authorized_last_name', e.target.value)} />
                    </div>
                    <FloatingInput id="institution_name" label="Kurum Bilgisi" value={data.institution_name} onChange={e => set('institution_name', e.target.value)} />
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
                      <div>
                        <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1.5">İl</label>
                        <CustomSelect
                          id="province"
                          value={data.province}
                          onChange={v => setData(prev => ({ ...prev, province: v, district: '' }))}
                          options={PROVINCE_NAMES.map(name => ({ value: name, label: name }))}
                          placeholder="İl seçiniz"
                          searchable
                        />
                      </div>
                      <div>
                        <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1.5">İlçe</label>
                        <CustomSelect
                          id="district"
                          value={data.district}
                          onChange={v => set('district', v)}
                          options={(PROVINCES_DISTRICTS[data.province] || []).map(name => ({ value: name, label: name }))}
                          placeholder={data.province ? 'İlçe seçiniz' : 'Önce il seçin'}
                          disabled={!data.province}
                          searchable
                        />
                      </div>
                    </div>
                    <FloatingInput id="authorized_role" label="Görevi / Unvanı" value={data.authorized_role} onChange={e => set('authorized_role', e.target.value)} />
                    <div className="grid sm:grid-cols-2 gap-x-4">
                      <div>
                        <FloatingInput id="phone" type="tel" label="Telefon Numarası" value={data.phone} onChange={e => set('phone', e.target.value)} />
                        {data.phone && !isValidMobilePhone(data.phone) ? (
                          <p className="text-xs text-red-600 mt-1">Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">SMS bildirimleri bu numaraya gönderilecektir.</p>
                        )}
                      </div>
                      <FloatingInput id="email" type="email" label="E-posta Adresi" value={data.email} onChange={e => set('email', e.target.value)} />
                    </div>
                  </div>

                  <div className="mt-8">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Ek Notlarınız (isteğe bağlı)</label>
                    <textarea
                      className="input-field focus:ring-red-500"
                      rows={4}
                      placeholder="Programın içeriği, özel ihtiyaçlar, salon veya etkinlik beklentileri gibi ek bilgileri buraya yazabilirsiniz..."
                      value={data.description}
                      onChange={e => set('description', e.target.value)}
                    />

                    {/* Program akışı dosyası (isteğe bağlı) */}
                    <input
                      ref={programFileInputRef}
                      type="file"
                      accept={PROGRAM_FILE_ACCEPT}
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        if (file.size > PROGRAM_FILE_MAX_SIZE) {
                          toast.error('Dosya boyutu en fazla 10 MB olabilir.');
                          return;
                        }
                        setProgramFile(file);
                      }}
                    />
                    {programFile ? (
                      <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <Paperclip size={16} className="text-red-600 flex-shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-sm text-gray-800">{programFile.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">{(programFile.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button
                          type="button"
                          onClick={() => setProgramFile(null)}
                          className="text-gray-400 hover:text-red-600 flex-shrink-0"
                          aria-label="Dosyayı kaldır"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => programFileInputRef.current?.click()}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors"
                      >
                        <Paperclip size={16} /> Program Akışı Ekle (isteğe bağlı)
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">Word, PDF, Excel, PowerPoint veya görsel · En fazla 10 MB</p>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-red-600 rounded-md border-gray-300 mt-0.5 focus:ring-red-500 flex-shrink-0"
                        checked={confirmed}
                        onChange={e => setConfirmed(e.target.checked)}
                      />
                      <span className="text-sm text-gray-600">
                        Girdiğim tüm bilgilerin doğruluğunu onaylıyorum ve{' '}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setTermsOpen(true); }}
                          className="font-medium text-red-700 hover:underline"
                        >
                          kullanım koşullarını
                        </button>{' '}
                        okudum, kabul ediyorum.
                      </span>
                    </label>
                  </div>

                  <Modal isOpen={termsOpen} onClose={() => setTermsOpen(false)} title="Kullanım Koşulları" size="lg">
                    <p className="text-sm text-gray-500 font-medium mb-4">
                      ÖNDER İmam Hatipliler Derneği Konaklama Merkezi Genel Kuralları
                    </p>
                    <ul className="space-y-3 mb-5">
                      {CAMP_RULES.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-gray-600 leading-relaxed pt-4 border-t border-gray-100">
                      Katılımcıların kuralları okuduğu ve anladığı kabul edilerek misafir edilmesine müsaade edilmiştir. Genel kurallara uygun olmayan tutum ve davranış sergileyenler ikinci bir uyarı yapılmaksızın konaklama merkezinden uzaklaştırılacaktır.
                    </p>
                  </Modal>

                  <div className="mt-6 flex items-center justify-between pt-6">
                    <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                      <ArrowLeft size={16} /> Geri
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitDisabled}
                      className="btn-fill btn-fill-white flex items-center gap-2 bg-red-700 border-2 border-red-700 enabled:hover:text-red-700 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-full transition-colors"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Rezervasyon Oluştur
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
