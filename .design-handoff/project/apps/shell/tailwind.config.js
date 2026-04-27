/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sea: {
          50:  '#e6f1f5',
          100: '#cce4ea',
          200: '#99c9d6',
          300: '#66aec1',
          400: '#3393ac',
          500: '#0a7898',
          600: '#086075',
          700: '#064a5b',
          800: '#0a4052',
          900: '#062f3e',
        },
        gold: {
          400: '#e0b063',
          500: '#c79448',
          600: '#a37835',
        },
      },
      fontFamily: {
        display: ['Palatino', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
