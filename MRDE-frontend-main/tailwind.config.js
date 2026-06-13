/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0b0e',
          secondary: '#111318',
          tertiary: '#1a1d24',
        },
        line: '#23262d',
        txt: {
          primary: '#e8eaed',
          secondary: '#9aa0a6',
        },
        accent: {
          blue: '#4fc3f7',
          cyan: '#26c6da',
        },
        risk: {
          critical: '#ef5350',
          high: '#ffa726',
          moderate: '#ffd54f',
          low: '#66bb6a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
