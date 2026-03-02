/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Monaco', 'monospace'],
      },
      borderRadius: {
        rm: '10px',
        'rm-lg': '12px',
      },
      boxShadow: {
        'rm-sm': '0 1px 2px rgba(0, 0, 0, 0.2)',
        rm: '0 4px 12px rgba(0, 0, 0, 0.25)',
        'rm-lg': '0 8px 24px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
