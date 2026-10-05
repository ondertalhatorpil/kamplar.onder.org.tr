import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ArrowRight, Plus, Phone, Mail, MapPinned, Send, BadgeCheck, Backpack } from 'lucide-react';
import Reveal, { EASE } from '../components/common/Reveal';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14 } },
};

// Konaklama merkezi genel kurallarının (data/campRules.js) ana sayfada
// soru-cevap olarak özetlenmiş hali.
const RULES_FAQ = [
  {
    q: 'Katılımcılar kamp binasından dışarı çıkabilir mi?',
    a: 'Katılımcılar bina dışına ancak grup sorumlularının refakatinde çıkabilir. Güvenlik tedbirleri gereği tüm balkonlar kullanıma kapalıdır.',
  },
  {
    q: 'Odalarda ve uyku saatlerinde nelere dikkat edilmeli?',
    a: 'Uyku saatleri tamamen grup sorumlularının kontrolündedir. Odalarda geç saatlere kadar oyun oynamak ve yüksek sesle müzik dinlemek yasaktır. Katılımcılar grup sorumlusundan izin almadan başka odalara giremez.',
  },
  {
    q: 'Yemek ve ikram konusunda kurallar nelerdir?',
    a: 'Yemek menüleri sabittir; menü dışındaki ihtiyaçları gruplar kendileri karşılar. Yemekhaneden yatakhaneye yiyecek ve içecek götürülemez. Merkezde birden fazla grup bulunuyorsa dışarıdan gelen ikramların tüm gruplara yetecek miktarda olması gerekir.',
  },
  {
    q: 'Sigara içilebilir mi?',
    a: 'Bina içerisinde ve koridorlarda sigara kullanımı kesinlikle yasaktır. Katılımcıların program boyunca kişisel bakım ve genel temizlik kurallarına özen göstermesi beklenir.',
  },
  {
    q: 'Eşyalara zarar gelirse ne olur?',
    a: 'Konaklama merkezinin eşya ve ekipman düzeninde değişiklik yapılamaz. Odalarda ve katlarda bulunan eşyalara verilen zararların maddi yükümlülüğü zarar veren kişiye veya gruba aittir.',
  },
  {
    q: 'Kurallara uyulmazsa ne olur?',
    a: 'Merkezde siyasi çalışma ve ideolojik propaganda yapılamaz; katılımcıların çevreyi rahatsız etmemesi beklenir. Genel kurallara uymayan ve uygunsuz davranış sergileyenler ikinci bir uyarı yapılmaksızın konaklama merkezinden uzaklaştırılır.',
  },
];

function RulesFaq() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="space-y-3">
      {RULES_FAQ.map(({ q, a }, i) => {
        const isOpen = openIndex === i;
        const number = String(i + 1).padStart(2, '0');
        return (
          <motion.div
            key={q}
            layout
            transition={{ duration: 0.35, ease: EASE }}
            className={`relative overflow-hidden rounded-3xl transition-colors duration-300 ${
              isOpen
                ? 'bg-neutral-900 shadow-xl shadow-brand/10'
                : 'bg-white/70 backdrop-blur-sm ring-1 ring-amber-100 hover:bg-white hover:ring-brand/30'
            }`}
          >
            {/* Brand accent bar that grows in on the open card */}
            <motion.span
              initial={false}
              animate={{ scaleY: isOpen ? 1 : 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              style={{ transformOrigin: 'top' }}
              className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"
            />

            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="group w-full flex items-center gap-4 sm:gap-5 px-5 sm:px-6 py-5 text-left"
            >
              <span
                className={`font-heading font-black text-2xl sm:text-3xl tabular-nums leading-none transition-colors duration-300 ${
                  isOpen ? 'text-brand' : 'text-brand/25 group-hover:text-brand/60'
                }`}
              >
                {number}
              </span>
              <span
                className={`flex-1 font-semibold transition-colors duration-300 ${
                  isOpen ? 'text-white' : 'text-gray-900'
                }`}
              >
                {q}
              </span>
              <span
                className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isOpen
                    ? 'bg-brand text-white rotate-45'
                    : 'bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white'
                }`}
              >
                <Plus size={18} strokeWidth={2.5} />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="overflow-hidden"
                >
                  <p className="pl-5 sm:pl-[5.25rem] pr-5 sm:pr-6 pb-6 text-stone-300 leading-relaxed">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

const PROCESS_STEPS = [
  { icon: MapPinned, title: 'Kamp Alanını Seç', desc: 'Grubuna uygun lokasyon ve tarihi belirleyip formu doldur.' },
  { icon: Send, title: 'Talebi İlet', desc: 'Bilgilerin yönetime ulaşsın ve SMS ile bilgilendiril.' },
  { icon: BadgeCheck, title: 'Onay Bekle', desc: 'Yönetim uygunluğu teyit edip rezervasyonunu onaylasın.' },
  { icon: Backpack, title: 'Çantanı Hazırla', desc: 'Gerekli belgeleri sisteme yükle ve kampa hazırlan!' },
];

// Mobile "stacking cards" scroll: each section stays pinned while the next
// one slides up over it. A section taller than the viewport can't pin at
// top:0 (its lower half would never be seen), so it pins once its bottom
// edge reaches the viewport bottom instead: top = viewportHeight - height.
// Only active below lg; desktop keeps the normal flow.
function useStackingTop() {
  const ref = useRef(null);
  const [top, setTop] = useState(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const mobile = window.matchMedia('(max-width: 1023px)');

    const update = () => {
      setTop(mobile.matches ? Math.min(0, window.innerHeight - el.offsetHeight) : undefined);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    mobile.addEventListener('change', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      mobile.removeEventListener('change', update);
    };
  }, []);

  return [ref, top];
}

// Frosted pill buttons in the hero; on hover brand red fills them from the
// bottom up (.btn-fill) and the label turns white.
const HERO_BUTTON_CLASS = 'btn-fill inline-flex items-center justify-center px-6 sm:px-8 py-3 rounded-full bg-white/75 backdrop-blur-md text-gray-900 text-sm sm:text-base font-semibold tracking-tight hover:text-white transition-colors duration-300';

export default function HomePage() {
  const [stepsRef, stepsTop] = useStackingTop();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-brand selection:text-white">
      {/* Hero Section — full-screen photo with an oversized, translucent
          headline running across its lower half, and a short subtitle plus
          two pill buttons anchored bottom-left. */}
      <section className="relative max-lg:sticky max-lg:top-0 h-screen h-[100svh] overflow-hidden">
        <img
          src="/slider.png"
          alt="ÖnderKamp kamp merkezi"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Darker toward the bottom where the text sits */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/20" />

        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="relative z-10 h-full px-4 sm:px-6 lg:px-8 pt-28 pb-20 sm:pb-24 flex flex-col justify-end"
        >
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.8, ease: EASE }}
            className="font-sans font-bold text-white/75 text-[13.5vw] sm:text-[10vw] lg:text-[8.2vw] leading-[0.88] tracking-[-0.045em] text-balance"
          >
            Grubunuz için en iyi kamp merkezi
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-6 sm:mt-10 max-w-3xl font-sans font-bold text-white/75 text-xl sm:text-3xl lg:text-[2.6vw] leading-tight tracking-[-0.03em]"
          >
            Bursa ve Büyükçekmece&apos;de grubunuzla huzurlu bir konaklama.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/rezervasyon"
              className={HERO_BUTTON_CLASS}
            >
              Rezervasyon Yap
            </Link>
            <Link
              to="/merkezlerimiz"
              className={HERO_BUTTON_CLASS}
            >
              Merkezleri Gör
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll cue — horizontally centered at the bottom on larger screens
            (hidden on phones, where the text block fills the bottom). Kept on
            a plain wrapper so framer-motion's transform can't break the
            centering. */}
        <div className="hidden lg:flex absolute bottom-24 inset-x-0 z-10 justify-center pointer-events-none">
          <motion.a
            href="#kampa-giden-yol"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
            className="pointer-events-auto group flex flex-col items-center gap-2.5 text-red-500 hover:text-white transition-colors"
          >
            <span className="relative w-6 h-10 rounded-full border-2 border-current flex justify-center">
              <motion.span
                animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-2 w-1 h-2 rounded-full bg-current"
              />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.3em] pl-[0.3em]">KEŞFET</span>
          </motion.a>
        </div>
      </section>

      {/* Adım Adım — red section, right below the hero photo. Fixed 4-card
          grid (no scrolling), connected by a route line drawn between the
          number circles. */}
      {/* Kampa Giden Yol — white panel that slides up over the bottom of the
          hero (negative margin + rounded top). Steps span the full width. */}
      <section
        id="kampa-giden-yol"
        ref={stepsRef}
        style={{ top: stepsTop }}
        className="relative max-lg:sticky z-20 -mt-10 sm:-mt-14 rounded-t-[2.5rem] sm:rounded-t-[3.5rem] bg-white py-20 sm:py-28 overflow-hidden max-lg:shadow-[0_-24px_48px_-12px_rgba(0,0,0,0.35)]"
      >
        <div className="relative max-w-7xl mx-auto px-6">
          <div>
            <Reveal className="mb-10 sm:mb-12">
              <span className="text-brand font-bold uppercase tracking-widest text-sm mb-4 block">4 Adımda Rezervasyon</span>
              <h2 className="font-heading font-bold text-3xl md:text-5xl text-gray-900 tracking-tight">
                Kampa Giden Yol
              </h2>
            </Reveal>

            {/* Numbered stepper: big numbered markers joined by a line —
                left-to-right on desktop, a top-to-bottom timeline on phones. */}
            <ol className="grid lg:grid-cols-4 lg:gap-5">
              {PROCESS_STEPS.map(({ icon: Icon, title, desc }, i) => {
                const isLast = i === PROCESS_STEPS.length - 1;
                return (
                  <motion.li
                    key={title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, delay: i * 0.12, ease: EASE }}
                    className="group flex lg:flex-col gap-4 lg:gap-5"
                  >
                    <div className="flex flex-col lg:flex-row items-center">
                      <span className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-brand text-white font-heading font-bold text-lg flex items-center justify-center shadow-lg shadow-brand/30 ring-8 ring-white">
                        {i + 1}
                      </span>
                      {!isLast && (
                        <span className="flex-1 w-0.5 lg:w-auto lg:h-0.5 lg:-mr-5 bg-gradient-to-b lg:bg-gradient-to-r from-brand to-brand/20" />
                      )}
                    </div>

                    <div className={`relative flex-1 overflow-hidden rounded-3xl bg-stone-50 ring-1 ring-gray-100 p-5 sm:p-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-gray-200/70 ${isLast ? '' : 'mb-5 lg:mb-0'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                          <Icon size={20} />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Adım {i + 1}</p>
                      </div>
                      <h3 className="font-heading font-bold text-lg text-gray-900 mb-1.5">{title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                      <span className="absolute left-0 bottom-0 h-1 w-full bg-brand origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />
                    </div>
                  </motion.li>
                );
              })}
            </ol>

            <Reveal className="mt-10">
              <Link
                to="/rezervasyon"
                className="btn-fill btn-fill-white inline-flex items-center gap-2 rounded-full bg-brand text-white border-2 border-brand hover:text-brand transition-colors duration-300 px-7 py-3.5 font-semibold"
              >
                Hemen Başla <ArrowRight size={18} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features Section — on mobile a red card sliding up over the pinned
          steps section. */}
      <section className="relative z-30 bg-gradient-to-b from-stone-50 to-amber-50/40 py-24 border-y border-amber-100/60 max-lg:bg-none max-lg:bg-brand max-lg:border-0 max-lg:-mt-10 max-lg:rounded-t-[2.5rem] max-lg:shadow-[0_-24px_48px_-12px_rgba(0,0,0,0.35)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid  gap-16 lg:gap-24 items-center">
            <Reveal>
              <span className="text-brand max-lg:text-white/75 font-bold uppercase tracking-widest text-sm mb-4 block">Kamp Kuralları</span>
              <h2 className="font-heading font-bold text-3xl md:text-4xl text-gray-900 max-lg:text-white mb-8 leading-tight">
                Merak Edilenler
              </h2>
              <RulesFaq />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer — dark, immersive tone matching the reference site's night sections */}
      
    </div>
  );
}
