/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'pastel-blue': '#bfdbfe',
        'pastel-purple': '#ddd6fe',
        'pastel-pink': '#fbcfe8',
        'pastel-green': '#bbf7d0',
        'pastel-yellow': '#fef08a',
        'pastel-orange': '#fed7aa',
        'pastel-red': '#fecaca',
        primary: {
          DEFAULT: '#60a5fa',
          light: '#93c5fd',
          dark: '#3b82f6'
        },
        background: {
          DEFAULT: '#ffffff',
          light: '#f8fafc',
          paper: '#ffffff'
        }
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
};