/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        netvault: {
          bg: {
            primary: 'var(--bg-primary)',
            secondary: 'var(--bg-secondary)',
          },
          toolbar: 'var(--toolbar-bg)',
          accent: 'var(--accent)',
          text: {
            primary: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
          },
          border: 'var(--border)',
          hover: 'var(--hover)',
          selected: 'var(--selected)',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};