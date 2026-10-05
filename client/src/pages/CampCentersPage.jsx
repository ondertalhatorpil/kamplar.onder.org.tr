import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, ArrowRight } from 'lucide-react';
import { CAMP_CENTERS } from '../data/campCenters';
import { EASE } from '../components/common/Reveal';

const PREVIEW_IMAGES = {
  bursa: '/camp-centers/bursakamp.png',
  buyukcekmece: '/camp-centers/buyukcekmecekamp.png',
};

const SHORT_NAME = {
  bursa: 'Bursa',
  buyukcekmece: 'Büyükçekmece',
};

export default function CampCentersPage() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);

  const activeCenter = CAMP_CENTERS[activeIndex];

  const goToCenter = (index) => {
    setActiveIndex(index);
    setNavigating(true);
    // Let the slide land on the chosen side before moving to the detail page.
    setTimeout(() => navigate(`/kamp-merkezi/${CAMP_CENTERS[index].slug}`), 450);
  };

  return (
    // One single, non-scrolling full-viewport screen: the selected center's
    // photo fills it edge-to-edge top to bottom, with the heading/toggle
    // overlaid near the top and the center's info/CTA overlaid near the
    // bottom — nothing below the fold, no scrolling at all.
    <div className="h-dvh w-full overflow-hidden relative bg-gray-900 text-white font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCenter.slug}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="absolute inset-0"
        >
          <img
            src={PREVIEW_IMAGES[activeCenter.slug]}
            alt={activeCenter.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/10 to-black/75" />
        </motion.div>
      </AnimatePresence>

      {/* Capacity badge — floats in the top-right corner on sm+; on phones it
          would crowd the floating menu button and heading, so it moves down
          next to the center name instead (see below). */}
      <div className="hidden sm:flex absolute z-20 top-24 right-8 bg-red-600 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm items-center gap-2">
        <Users size={16} /> {activeCenter.capacity}
      </div>

      {/* Content overlay — heading/toggle pinned near the top, name/location
          and the detail button pinned at the bottom, image visible between */}
      <div className="relative z-10 h-full flex flex-col justify-between px-6 pt-32 sm:pt-24 pb-6 sm:pb-10">
        <div className="text-center max-w-2xl mx-auto w-full">
          <h1 className="font-heading font-bold text-3xl sm:text-5xl text-white tracking-tight mb-2 sm:mb-4 drop-shadow-sm">
            Kamp Merkezlerimiz
          </h1>

          {/* Sliding two-option toggle — same design as the "Beyefendi /
              Hanımefendi" selector on the reservation form: a pill-shaped
              track with a solid sliding thumb behind the active label. */}
          <div className="flex justify-center">
            <div className="relative flex items-center h-[46px] sm:h-[50px] w-full max-w-xs sm:max-w-sm rounded-full border-2 border-brand p-1 overflow-hidden bg-white">
              <span
                aria-hidden="true"
                className={`absolute top-1 left-1 bottom-1 w-[calc(50%-0.35rem)] rounded-full bg-red-600 transition-all duration-500 ease-out ${
                  activeIndex === 1 ? 'translate-x-[calc(100%+0.25rem)]' : ''
                }`}
              />
              {CAMP_CENTERS.map((center, i) => (
                <button
                  key={center.slug}
                  type="button"
                  disabled={navigating}
                  onMouseEnter={() => !navigating && setActiveIndex(i)}
                  onClick={() => !navigating && setActiveIndex(i)}
                  className={`relative z-10 flex-1 h-full rounded-full font-heading text-base sm:text-lg transition-colors duration-500 disabled:cursor-default outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                    activeIndex === i ? 'text-white font-bold' : 'text-black hover:text-gray-700 font-medium'
                  }`}
                >
                  {SHORT_NAME[center.slug]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: name + location on the left, detail button on the right */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-widest mb-3 sm:mb-20">
              <span className="sm:hidden inline-flex items-center gap-1.5 bg-red-600 text-white normal-case tracking-normal text-sm px-3 py-1.5 rounded-full shadow-sm">
                <Users size={14} /> {activeCenter.capacity}
              </span>
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-4xl text-white leading-tight">{activeCenter.name}</h2>
          </div>
          <button
            type="button"
            onClick={() => goToCenter(activeIndex)}
            className="btn-fill btn-fill-white flex-shrink-0 inline-flex items-center gap-2 bg-brand text-white border-2 border-brand hover:text-brand transition-colors duration-300 px-4 sm:px-6 py-3 rounded-full font-bold shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
          >
            <span className="hidden sm:inline">Detaylı Bilgi</span> <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
