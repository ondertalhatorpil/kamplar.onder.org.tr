import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CalendarCheck, MapPin, Menu, X } from 'lucide-react';

// Same 3-item floating icon nav as besiraga.onder.org.tr's navbar (same
// ÖNDER organization): icon-only links, no visible text on desktop, a
// magic-ink hover bubble, and a solid brand-red pill background once the
// page is scrolled.
const NAV_ITEMS = [
  { id: 1, Icon: Home, to: '/', label: 'Ana Sayfa' },
  { id: 2, Icon: CalendarCheck, to: '/rezervasyon', label: 'Rezervasyon Yap' },
  { id: 3, Icon: MapPin, to: '/merkezlerimiz', label: 'Merkezlerimiz' },
];

const listVariants = {
  hidden: { opacity: 0, y: -20, transition: { duration: 0.2, ease: 'easeOut' } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeIn', staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

const tooltipVariants = {
  // x: '-50%' centers the tooltip; a Tailwind -translate-x-1/2 would be
  // overwritten by the transform framer-motion writes for y/scale.
  hidden: { opacity: 0, x: '-50%', y: -5, scale: 0.95 },
  visible: { opacity: 1, x: '-50%', y: 0, scale: 1 },
};

function DesktopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      className="w-full fixed top-0 left-0 z-[1000]"
      variants={{
        top: { paddingTop: '2rem', paddingBottom: '2rem' },
        scrolled: { paddingTop: '1rem', paddingBottom: '1rem' },
      }}
      animate={scrolled ? 'scrolled' : 'top'}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-16">
          <ul className="flex items-center space-x-2 relative" onMouseLeave={() => setHoveredId(null)}>
            {NAV_ITEMS.map(item => (
              <li key={item.id} className="relative">
                <Link
                  to={item.to}
                  aria-label={item.label}
                  onMouseEnter={() => setHoveredId(item.id)}
                  className={`relative block p-3 text-lg font-semibold rounded-lg transition-all duration-300 ease-in-out ${
                    scrolled
                      ? 'bg-brand backdrop-blur-md shadow-lg border border-brand text-white'
                      : 'bg-transparent shadow-none border-transparent text-brand'
                  }`}
                >
                  {hoveredId === item.id && (
                    <motion.div
                      layoutId="magic-ink"
                      className="absolute inset-0 bg-brand rounded-lg z-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${hoveredId === item.id ? 'text-white' : ''}`}>
                    <item.Icon size={24} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.nav>
  );
}

function MobileNav() {
  const [hoveredId, setHoveredId] = useState(null);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen(o => !o);
    setHoveredId(null);
  };

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [open]);

  return (
    <div className="fixed top-5 left-0 w-full z-[1000] md:hidden px-4">
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          onClick={toggle}
          aria-label="Menüyü aç/kapat"
          className="p-2 cursor-pointer text-white flex items-center justify-center rounded-full transition-all duration-300 z-[1001] hover:bg-brand-dark hover:border-brand-dark shadow-[0_5px_15px_rgba(0,0,0,0.15)] bg-brand border border-brand"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={open ? 'x' : 'menu'}
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </motion.div>
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute top-full mt-2 bg-brand backdrop-blur-md rounded-full shadow-xl border border-brand overflow-hidden"
              variants={listVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onMouseLeave={() => setHoveredId(null)}
            >
              <motion.ul className="flex flex-row p-1.5" variants={listVariants}>
                {NAV_ITEMS.map(item => (
                  <motion.li key={item.id} variants={itemVariants} className="relative">
                    <AnimatePresence>
                      {hoveredId === item.id && (
                        <motion.div
                          className="absolute bottom-full left-1/2 mb-2 px-2 py-0.5 bg-amber-800 text-amber-50 text-xs font-semibold rounded-full shadow-md whitespace-nowrap"
                          variants={tooltipVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                        >
                          {item.label}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Link
                      to={item.to}
                      onClick={toggle}
                      onMouseEnter={() => setHoveredId(item.id)}
                      className="flex items-center justify-center w-12 h-12 text-white rounded-full transition-colors duration-200 hover:bg-amber-100"
                    >
                      <item.Icon size={22} />
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Navbar() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
