/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#244B3C',
          light: '#2E5E4C',
          dark: '#1B382D',
          hover: '#1E3E32',
        },
        'deep-forest': {
          DEFAULT: '#17271F',
          dark: '#111D17',
          surface: '#1D3027',
          card: '#1F342A',
        },
        charcoal: {
          DEFAULT: '#171B18',
          soft: '#202521',
          light: '#2B312C',
        },
        'warm-ivory': {
          DEFAULT: '#F5F1E8',
          light: '#FAF7F2',
          muted: '#ECE7DC',
          dark: '#E2DCCF',
        },
        'muted-sage': {
          DEFAULT: '#A8B6A0',
          light: '#C8D3C3',
          dark: '#7D8C75',
          subtle: '#E8EFE6',
        },
        'secondary-text': '#777E75',
        'border-natural': '#DCDDD4',
        'border-dark': '#293D32',
        'border-dark-subtle': '#23342B',
      },
      fontFamily: {
        serif: ['"Newsreader"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(23, 27, 24, 0.05), 0 1px 2px rgba(23, 27, 24, 0.03)',
        'card': '0 4px 20px -2px rgba(23, 27, 24, 0.06), 0 2px 6px -1px rgba(23, 27, 24, 0.03)',
        'elevated': '0 12px 36px -4px rgba(23, 27, 24, 0.12), 0 4px 12px -2px rgba(23, 27, 24, 0.06)',
        'dark-card': '0 10px 30px -5px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
}


