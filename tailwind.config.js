/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2E2E2B',
        sand: '#F5F0EB',
        line: '#E7E2DA',
        done: '#3F7D55',
        wait: '#C96F2B',
        part: '#77736C',
      },
      fontFamily: { sans: ['Heebo', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
