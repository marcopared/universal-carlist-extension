/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./popup.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36acf7',
          500: '#0c90e8',
          600: '#0072c6',
          700: '#015aa1',
          800: '#064d85',
          900: '#0b406e',
          950: '#07294a',
        },
        accent: {
          DEFAULT: '#10b981',
          dark: '#059669',
        }
      },
    },
  },
  plugins: [],
}

