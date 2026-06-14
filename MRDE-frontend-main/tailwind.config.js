/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
        },
        line: 'var(--color-line)',
        txt: {
          primary: 'var(--color-txt-primary)',
          secondary: 'var(--color-txt-secondary)',
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
