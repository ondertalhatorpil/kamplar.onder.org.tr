import { motion } from 'framer-motion';

export const EASE = [0.22, 1, 0.36, 1];

// Scroll-triggered fade/slide-in wrapper — used across the public site so
// sections and cards animate into place as the visitor scrolls to them.
export default function Reveal({ children, delay = 0, y = 28, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
