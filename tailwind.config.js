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
          DEFAULT: '#C9962A',
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
          DEFAULT: '#C8CC7A',
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
        'primary-gold': '#C9962A',
        'primary-olive': '#C8CC7A',
        'dark-olive': '#9AA356',
        'light-olive': '#F0F2D8',
        'gold-dark': '#8B6914',
        'gold-light': '#E8C96A',
        charcoal: '#2C2416',
        
        // Exact requested design system colors
        'olive-light': '#F0F2D8',
        'olive-dark': '#9AA356',
        'cream': '#FEFCF5',
        'brown': '#5C4A00',
        'brown-dark': '#3D2E00',
        'gray-100': '#F8F6F0',
        'gray-200': '#EDE8DC',
        'white': '#FFFFFF',
        
        // Compatibility fallbacks for older code
        petal: '#FEFCF5',
        forest: '#9AA356',
        nearwhite: '#FFFFFF',
        blush: '#F0F2D8',
        rose: {
          DEFAULT: '#C9962A',
          light: '#F0F2D8',
          dark: '#8B6914',
        },
        purple: {
          DEFAULT: '#C8CC7A',
          light: '#F0F2D8',
        },
      },
      borderRadius: {
        '2xl': '20px',
        'xl': '12px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(92, 74, 0, 0.08)',
        'float': '0 8px 32px rgba(92, 74, 0, 0.15)',
        'button': '0 4px 16px rgba(201, 150, 42, 0.3)',
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
