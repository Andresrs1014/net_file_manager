/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        nv: {
          base:            'var(--bg-base)',
          surface:         'var(--bg-surface)',
          raised:          'var(--bg-raised)',
          overlay:         'var(--bg-overlay)',
          hover:           'var(--bg-hover)',
          selected:        'var(--bg-selected)',
          border:          'var(--border-default)',
          'border-subtle': 'var(--border-subtle)',
          'border-strong': 'var(--border-strong)',
          'border-accent': 'var(--border-accent)',
          accent:          'var(--accent)',
          'accent-dim':    'var(--accent-dim)',
          'accent-hover':  'var(--accent-hover)',
          'text-primary':  'var(--text-primary)',
          'text-secondary':'var(--text-secondary)',
          'text-muted':    'var(--text-muted)',
          'text-accent':   'var(--text-accent)',
          success:         'var(--success)',
          warning:         'var(--warning)',
          danger:          'var(--danger)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-sm':     '0 0 10px var(--accent-glow)',
        'glow-md':     '0 0 20px var(--accent-glow)',
        'panel':       '0 0 0 1px var(--border-default)',
        'panel-active':'0 0 0 1px var(--border-accent), 0 0 20px var(--accent-dim)',
      },
    },
  },
  plugins: [],
};
