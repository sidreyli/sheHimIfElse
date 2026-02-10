/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#1a1a2e',
          800: '#16213e',
          700: '#1f2b47',
          600: '#2a3a5c',
        },
        accent: {
          chat: '#60a5fa',
          asl: '#34d399',
          stt: '#fbbf24',
          primary: '#a78bfa',
        },
      },
    },
  },
  plugins: [],
};
