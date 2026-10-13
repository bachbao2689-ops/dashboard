/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#002e6d',
          dark: '#001f4d',
          cyan: '#38bdf8',
          glow: '#4eb648',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'liquid-sm': '0 2px 8px rgba(18, 48, 94, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        'liquid-md': '0 10px 30px rgba(18, 48, 94, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'liquid-lg': '0 20px 50px rgba(0, 0, 0, 0.18)',
        'dark-liquid': '0 14px 36px rgba(0, 8, 24, 0.45), inset 0 1px 0 rgba(215, 235, 255, 0.12)',
      },
      backdropBlur: {
        '2xl': '32px',
        '3xl': '48px',
      },
      transitionTimingFunction: {
        'spring-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'spring-bouncy': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
};
