const RED = {
  50: '#fdf3f3',
  100: '#fbe4e4',
  200: '#f7cdcd',
  300: '#efa7a8',
  400: '#e47475',
  500: '#da4a4b',
  600: '#d02a2b', // Ana renk
  700: '#d02a2b', // Ana renk
  800: '#b02223', // Hover
  900: '#8e1b1c',
  950: '#5e1213',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tüm sitedeki kırmızı #d02a2b üzerinden türetilir. 600 ve 700 ana renktir
        // (butonlar/dolgular), 800 hover tonudur. Tailwind'in varsayılan `red`
        // paleti de aynı skalaya bağlanır, böylece red-* ve primary-* aynı kalır.
        primary: RED,
        red: RED,
        navy: {
          50: '#fef2f2',
          600: '#7f1d1d',
          700: '#6b1414',
          800: '#4c0d0d',
          900: '#330808',
        },
        // Exact brand red from besiraga.onder.org.tr (same ÖNDER organization),
        // used on the homepage to match that site's look.
        brand: {
          DEFAULT: '#d02a2b',
          dark: '#b02223', // hover
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
        // Heading font used on besiraga.onder.org.tr's homepage — opt-in via
        // font-heading so it only applies where the homepage uses it.
        heading: ['"Maven Pro"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.8s ease-out both',
      },
    },
  },
  plugins: [],
}
