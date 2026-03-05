import PrimeUI from 'tailwindcss-primeui';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.375rem' }],
        base: ['1.0625rem', { lineHeight: '1.5rem' }],
        lg: ['1.1875rem', { lineHeight: '1.75rem' }],
        xl: ['1.3125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      colors: {
        rm: {
          bg: 'rgb(var(--rm-bg) / <alpha-value>)',
          'bg-elevated': 'rgb(var(--rm-bg-elevated) / <alpha-value>)',
          surface: 'rgb(var(--rm-surface) / <alpha-value>)',
          'surface-hover': 'rgb(var(--rm-surface-hover) / <alpha-value>)',
          text: 'rgb(var(--rm-text) / <alpha-value>)',
          muted: 'rgb(var(--rm-muted) / <alpha-value>)',
          accent: 'rgb(var(--rm-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--rm-accent-hover) / <alpha-value>)',
          border: 'rgb(var(--rm-border) / <alpha-value>)',
          'border-focus': 'rgb(var(--rm-border-focus) / <alpha-value>)',
          success: 'rgb(var(--rm-success) / <alpha-value>)',
          warning: 'rgb(var(--rm-warning) / <alpha-value>)',
          danger: 'rgb(var(--rm-danger) / <alpha-value>)',
          info: 'rgb(var(--rm-info) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Monaco', 'monospace'],
      },
      borderRadius: {
        rm: '10px',
        'rm-lg': '12px',
        'rm-dynamic': 'var(--rm-radius)',
      },
      boxShadow: {
        'rm-sm': '0 1px 2px rgba(0, 0, 0, 0.2)',
        rm: '0 4px 12px rgba(0, 0, 0, 0.25)',
        'rm-lg': '0 8px 24px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [PrimeUI],
};
