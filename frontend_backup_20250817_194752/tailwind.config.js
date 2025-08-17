/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aplo: {
          orange: '#ff5b2c',
          cream: '#f8efea',
          yellow: '#fecf2f',
          purple: '#681c66',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fefdf0',
          100: '#fefbe0',
          200: '#fef7c0',
          300: '#fef3a0',
          400: '#feef80',
          500: '#fecf2f',
          600: '#f4c20a',
          700: '#eab500',
          800: '#e0a800',
          900: '#d69b00',
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'aplo': '0 4px 20px -2px rgba(255, 91, 44, 0.15), 0 2px 8px -1px rgba(255, 91, 44, 0.1)',
      },
    },
  },
  plugins: [],
}
