/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1677ff',
        'primary-hover': '#4096ff',
        'primary-active': '#0958d9'
      },
      borderRadius: {
        '8px': '8px'
      }
    }
  },
  plugins: [],
  corePlugins: {
    preflight: false
  }
}
