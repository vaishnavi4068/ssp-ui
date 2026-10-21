/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['"Outfit"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        polaris: {
          primary: '#008060',
          primaryHover: '#006e52',
          surface: '#F1F2F4',
          card: '#FFFFFF',
          accent: '#005BD3',
          ink: '#1A1C1D',
        },
      },
    },
  },
  plugins: [],
};
