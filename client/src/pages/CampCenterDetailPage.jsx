import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, MapPin, Users, Utensils, ImageOff, X, Maximize2,
  BedDouble, Layers, ShowerHead, BookOpen, NotebookPen, Presentation, Projector, Landmark,
  Trees, Gamepad2, UtensilsCrossed, Coffee, Navigation, ExternalLink,
} from 'lucide-react';
import { CAMP_CENTERS } from '../data/campCenters';
import Reveal, { EASE } from '../components/common/Reveal';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Same amenities list for every camp center — shown as an icon grid below
// the gallery on the detail page.
const FACILITIES = [
  { icon: BedDouble, label: '4-10 Kişilik Yatakhane' },
  { icon: Layers, label: 'Yorgan, Yastık, Nevresim Takımı' },
  { icon: ShowerHead, label: 'Duş, Lavabo, Tuvalet' },
  { icon: BookOpen, label: 'Mini Kütüphane' },
  { icon: NotebookPen, label: 'Ders Çalışma Alanları' },
  { icon: Presentation, label: '20-30 Kişilik Sınıflar' },
  { icon: Projector, label: 'Projeksiyon Cihazı' },
  { icon: Landmark, label: 'Mescit / Buluşma Alanı / Toplantı Alanı' },
  { icon: Trees, label: 'Bahçe İmkânı' },
  { icon: Gamepad2, label: 'Hobi Alanları' },
  { icon: UtensilsCrossed, label: 'Sabah Yemeği İmkânı' },
  { icon: Coffee, label: 'Gün İçerisinde Çay İkramı' },
];
const FACILITIES2 = [
  { icon: BedDouble, label: '4-10 Kişilik Yatakhane' },
  { icon: Layers, label: 'Yorgan, Yastık, Nevresim Takımı' },
  { icon: ShowerHead, label: 'Duş, Lavabo, Tuvalet' },
  { icon: BookOpen, label: 'Mini Kütüphane' },
  { icon: NotebookPen, label: 'Ders Çalışma Alanları' },
  { icon: Presentation, label: '20-30 Kişilik Sınıflar' },
  { icon: Projector, label: 'Projeksiyon Cihazı' },
  { icon: Landmark, label: 'Mescit / Buluşma Alanı / Toplantı Alanı' },
  { icon: Trees, label: 'Bahçe İmkânı' },
  { icon: Gamepad2, label: 'Hobi Alanları' },
  { icon: UtensilsCrossed, label: 'Sabah - Akşam Yemeği İmkânı' },
  { icon: Coffee, label: 'Gün İçerisinde Çay İkramı' },
];

// No backend endpoint lists the folder's contents (photos are just dropped
// into public/ by hand), so we probe a generous range of filenames
// (1.jpg, 2.jpg, ...) and keep whichever ones actually exist. Effectively
// unlimited for a camp gallery, without needing a fixed slot count.
const GALLERY_PROBE_COUNT = 40;
const PAGE_SIZE = 9;

// Probes `${folder}/1.jpg` .. `${folder}/N.jpg` and resolves to the ordered
// list of URLs that actually exist. Returns null while still probing.
function useCampGallery(folder) {
  const [images, setImages] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setImages(null);
    const results = new Array(GALLERY_PROBE_COUNT).fill(null);
    let settled = 0;

    for (let i = 1; i <= GALLERY_PROBE_COUNT; i++) {
      const img = new Image();
      const finish = (ok) => {
        if (ok) results[i - 1] = `${folder}/${i}.jpg`;
        settled += 1;
        if (settled === GALLERY_PROBE_COUNT && !cancelled) {
          setImages(results.filter(Boolean));
        }
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = `${folder}/${i}.jpg`;
    }

    return () => { cancelled = true; };
  }, [folder]);

  return images;
}

function Lightbox({ images, index, altBase, onClose, onIndexChange }) {
  const goPrev = () => onIndexChange((index - 1 + images.length) % images.length);
  const goNext = () => onIndexChange((index + 1) % images.length);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[1100] bg-black/90 flex items-center justify-center p-4 sm:p-10"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
      >
        <X size={22} />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}

      <AnimatePresence mode="wait">
        <motion.img
          key={images[index]}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          src={images[index]}
          alt={`${altBase} fotoğraf ${index + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-xl"
        />
      </AnimatePresence>

      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
          {index + 1} / {images.length}
        </div>
      )}
    </motion.div>
  );
}

function Gallery({ center }) {
  const images = useCampGallery(center.galleryFolder);
  const [page, setPage] = useState(1);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (images === null) {
    return <div className="py-16 text-center text-sm text-gray-400 font-medium">Yükleniyor...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
        <ImageOff size={32} />
        <p className="text-sm font-medium">Bu kamp merkezi için henüz fotoğraf eklenmedi.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(images.length / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageImages = images.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div>
      {/* Bento-style mosaic — the first photo of each page runs bigger
          (2x2) to break up the grid instead of a flat uniform wall of tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-[130px] sm:auto-rows-[170px] gap-3 sm:gap-4">
        {pageImages.map((src, i) => {
          const featured = i === 0;
          return (
            <motion.button
              key={src}
              type="button"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.04 }}
              onClick={() => setLightboxIndex(startIndex + i)}
              className={classNames(
                'group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100',
                featured && 'col-span-2 row-span-2'
              )}
            >
              <img
                src={src}
                alt={`${center.name} fotoğraf ${startIndex + i + 1}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm">
                  <Maximize2 size={16} className="text-gray-900" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={classNames(
                'w-9 h-9 rounded-full text-sm font-bold transition-all duration-300',
                p === page ? 'bg-red-700 text-white scale-110 shadow-md shadow-red-700/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            images={images}
            index={lightboxIndex}
            altBase={center.name}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Location card — embedded Google map on the left, address + action buttons
// on the right. Share links (maps.app.goo.gl) can't be iframed, so the embed
// uses `mapEmbedUrl` when given and otherwise falls back to an address search.
// Embed URLs carry the pinned place's name either URL-encoded (`!2s<name>`)
// or as unpadded URL-safe base64 (`!2z<name>`); reused as the directions/
// search target when no address is given.
function placeNameFromEmbed(url) {
  const match = url?.match(/!2([sz])([^!]+)/);
  if (!match) return null;
  try {
    if (match[1] === 's') return decodeURIComponent(match[2]);
    const bin = atob(match[2].replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

function LocationSection({ center }) {
  const { address, mapsUrl, mapEmbedUrl } = center;
  if (!address && !mapsUrl && !mapEmbedUrl) return null;

  const destination = address || placeNameFromEmbed(mapEmbedUrl);

  const embedSrc = mapEmbedUrl
    || (address && `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`);
  const directionsUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : mapsUrl;
  const openUrl = mapsUrl
    || (destination && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`);

  return (
    <section className="px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <Reveal className="mb-10">
          <h2 className="font-extrabold text-3xl md:text-4xl text-gray-900 tracking-tight mb-3">Konum</h2>
          <p className="text-gray-500 text-lg font-medium">{center.name}'ne nasıl ulaşırsınız.</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="grid lg:grid-cols-5 gap-5 lg:gap-6">
            <div className="relative lg:col-span-3 h-[300px] sm:h-[380px] lg:h-auto lg:min-h-[420px] rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-xl">
              {embedSrc ? (
                <iframe
                  src={embedSrc}
                  title={`${center.name} konumu`}
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-red-700 transition-colors"
                >
                  <MapPin size={36} />
                  <span className="text-sm font-bold">Haritayı Google Maps'te görüntüle</span>
                </a>
              )}
            </div>

            <div className="lg:col-span-2 relative bg-gray-900 text-white rounded-[2.5rem] p-8 sm:p-10 overflow-hidden flex flex-col">
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-red-600/30 rounded-full blur-[70px]" />
              <div className="relative flex-1">
                <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center mb-6 shadow-lg shadow-red-900/40">
                  <MapPin size={26} strokeWidth={1.75} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-300 mb-2">{center.location}</p>
                <h3 className="font-extrabold text-2xl sm:text-3xl tracking-tight mb-4">{center.name}</h3>
                {address && (
                  <p className="text-gray-300 font-medium leading-relaxed">{address}</p>
                )}
              </div>

              <div className="relative flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 mt-8">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-fill btn-fill-white flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-red-600 border-2 border-red-600 hover:text-red-600 transition-colors duration-300 rounded-full font-bold text-sm shadow-lg shadow-red-900/30"
                >
                  <Navigation size={16} /> Yol Tarifi Al
                </a>
                {openUrl && (
                  <a
                    href={openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-fill flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 rounded-full font-bold text-sm"
                  >
                    <ExternalLink size={16} /> Haritada Aç
                  </a>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function CampCenterDetailPage() {
  const { slug } = useParams();
  const center = useMemo(() => CAMP_CENTERS.find(c => c.slug === slug), [slug]);

  if (!center) return <Navigate to="/" replace />;

  const Icon = center.icon;
  // Büyükçekmece serves both breakfast and dinner, unlike Bursa (breakfast
  // only), so its facilities list uses the matching "Sabah - Akşam Yemeği" wording.
  const facilities = center.slug === 'buyukcekmece' ? FACILITIES2 : FACILITIES;

  return (
    <div className="min-h-screen bg-white text-gray-800 font-display">
      {/* No page-local header — the global floating Navbar is the only
          header now. */}

      {/* Hero — clean and minimal: no colored block, just the real photo
          sitting next to the text. */}
      <section className="pt-28 lg:pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-red-700 uppercase tracking-widest mb-5">
                <MapPin size={16} /> {center.location}
              </div>

              <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.1] text-gray-900 tracking-tight mb-6">
                {center.name}
              </h1>
              <p className="text-lg text-gray-600 font-medium leading-relaxed max-w-xl mb-8">
                {center.desc}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 text-red-800 rounded-xl px-4 py-2 text-sm font-bold">
                  <Users size={16} /> {center.capacity} Kapasite
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
              className="relative"
            >
              <div className={`absolute -inset-4 bg-gradient-to-br ${center.gradient} opacity-10 rounded-[3rem] blur-2xl -z-10`} />
              <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-xl">
                <img
                  src={`/camp-centers/${center.slug}-kamp-merkezi.jpg`}
                  alt={center.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="px-4 py-10 max-w-6xl mx-auto">
        <Reveal className="mb-10">
          <h2 className="font-extrabold text-3xl md:text-4xl text-gray-900 tracking-tight mb-3">Galeri</h2>
          <p className="text-gray-500 text-lg font-medium">{center.name}'nden kareler.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <Gallery center={center} />
        </Reveal>
      </section>

      {/* Facilities — tinted section, circular icon badges alternating red/
          amber for rhythm, with a small rotated accent shape per card. */}
      <section className="px-6 py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <Reveal className="mb-10">
            <h2 className="font-extrabold text-3xl md:text-4xl text-gray-900 tracking-tight mb-3">
              Konaklama Merkezinde Bulunan İmkanlar
            </h2>
            <p className="text-gray-500 text-lg font-medium">{center.name}'nde sizi neler bekliyor.</p>
          </Reveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {facilities.map(({ icon: FacilityIcon, label }, i) => {
              const isAlt = i % 2 === 1;
              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, ease: EASE, delay: (i % 8) * 0.04 }}
                  whileHover={{ y: -4 }}
                  className="group relative bg-white border border-gray-100 rounded-[1.75rem] p-4 sm:p-6 text-center shadow-sm hover:shadow-lg group-hover:bg-red-600 transition-shadow duration-300 overflow-hidden"
                >
                 
                  <div
                    className={classNames(
                      'relative w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-full flex items-center justify-center mb-3 sm:mb-4 transition-colors duration-300',
                      isAlt ? 'bg-red-600 text-white group-hover:bg-red-800 group-hover:text-white'
                        : 'bg-red-600 text-white group-hover:bg-red-800 group-hover:text-white'
                    )}
                  >
                    <FacilityIcon size={18} strokeWidth={1.75} className="sm:hidden" />
                    <FacilityIcon size={24} strokeWidth={1.75} className="hidden sm:block" />
                  </div>
                  <p className="relative text-gray-800 font-bold text-xs sm:text-base leading-snug">{label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <LocationSection center={center} />

      {/* CTA */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <Reveal className="bg-red-700 rounded-[3rem] p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          <div className="relative z-10">
            <h3 className="font-extrabold text-3xl text-white mb-4">{center.name} İçin Rezervasyon Oluşturun</h3>
            <p className="text-red-100/80 mb-8 font-medium max-w-xl mx-auto">
              Grubunuz için tarih ve katılımcı bilgilerinizi paylaşın, ekibimiz en kısa sürede sizinle iletişime geçsin.
            </p>
            <Link
              to="/rezervasyon"
              className="btn-fill btn-fill-dark inline-flex items-center gap-2 px-8 py-4 bg-white text-red-700 rounded-full font-bold shadow-lg hover:text-white transition-colors duration-300"
            >
              Rezervasyon Yap <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Minimal footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col-6 sm:flex-row items-center justify-center gap-4 text-sm text-gray-400 font-medium">
          <p>© {new Date().getFullYear()} ÖnderKamp.</p>
        </div>
      </footer>
    </div>
  );
}
