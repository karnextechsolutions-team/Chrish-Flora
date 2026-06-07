/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdf8ec',
          100: '#f9eed0',
          200: '#f2d99d',
          300: '#e9be63',
          400: '#e2a535',
          500: '#C9962A',
          600: '#b8860b',
          700: '#96690a',
          800: '#7a5310',
          900: '#654511',
          950: '#3a2506',
        },
        olive: {
          50:  '#f9faea',
          100: '#f1f3ce',
          200: '#e4e8a0',
          300: '#cfd569',
          400: '#BEC96A',
          500: '#a8b347',
          600: '#838d34',
          700: '#636b29',
          800: '#505726',
          900: '#444a24',
          950: '#24280f',
        },
        flora: {
          bg:      '#C8CC7A',
          gold:    '#C9962A',
          'gold-dark': '#8B6914',
          brown:   '#5C4A00',
          cream:   '#FBF7EE',
          'cream-dark': '#F2EAD8',
        },
      },
      fontFamily: {
        serif:  ['Cormorant Garamond', 'Georgia', 'serif'],
        sans:   ['DM Sans', 'system-ui', 'sans-serif'],
        display:['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
