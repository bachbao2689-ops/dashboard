/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Barlow', 'sans-serif'] },
      
      colors: {
        gray: {
          50: '#f6f9fe',
          100: '#eef3fb',
          200: '#e0eaf8',
          300: '#a8b7cc',
          400: '#8b9ebb',
          500: '#6f84a1',
          600: '#526986',
          700: '#38506b',
          800: '#093570',
          900: '#093570',
          950: '#0d2238',
        },

        primary: "var(--color-primary)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        glass: {
          light: "rgba(255, 255, 255, 0.4)",
          lighter: "rgba(255, 255, 255, 0.6)",
          dark: "rgba(255, 255, 255, 0.2)",
        }
      },
      spacing: {
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "1rem",
        '2xl': "18px",
        '3xl': "24px",
      },
      boxShadow: {
        'sm': '0 3px 15px rgba(9, 47, 102, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-inset': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.3)',
      },
      animation: {
        'liquid-blob': 'liquidBlob 20s infinite alternate',
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeInUp: { '0%' : { opacity: 0, transform: 'translateY(20px)' }, '100%' : { opacity: 1, transform: 'translateY(0)' } },
        liquidBlob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
