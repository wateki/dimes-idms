/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        // Custom palette colors - Primary Greens (from palette Row 5 & 7)
        'green': {
          50: '#D3FBD6',   // Very light emerald (#D3FBD6)
          100: '#76EFB2',  // Light emerald (#76EFB2)
          200: '#5FC369',  // Medium-light emerald (#5FC369)
          300: '#499951',  // Medium emerald - PRIMARY (#499951)
          400: '#53A551',  // Medium emerald alt (#53A551)
          500: '#579D47',  // Medium forest green (#579D47)
          600: '#34713A',  // Dark emerald (#34713A)
          700: '#3D7D3C',  // Dark green (#3D7D3C)
          800: '#285627',  // Very dark green (#285627)
          900: '#214C25',  // Almost black green (#214C25)
          950: '#153314',  // Extremely dark green (#153314)
        },
        // Orange/Warm tones (from palette Row 2)
        'orange': {
          50: '#FEEEE6',   // Very light peach (#FEEEE6)
          100: '#FBCCB1',  // Light peach (#FBCCB1)
          200: '#F89736',  // Vibrant orange - ACCENT (#F89736)
          300: '#C37628',  // Medium brown-orange (#C37628)
          400: '#91561B',  // Dark brown (#91561B)
          500: '#62390F',  // Very dark brown (#62390F)
          600: '#371D05',  // Almost black brown (#371D05)
        },
        // Golden tones (from palette Row 3)
        'gold': {
          50: '#FEE6D0',   // Pale creamy orange (#FEE6D0)
          100: '#FDB437',  // Bright golden yellow-orange (#FDB437)
          200: '#CD901D',  // Deep golden brown (#CD901D)
          300: '#8D6D14',  // Dark golden brown (#8D6D14)
          400: '#704D0B',  // Very dark golden brown (#704D0B)
        },
        // Lime greens (from palette Row 6)
        'lime': {
          50: '#B0F275',   // Bright lime green (#B0F275)
          100: '#90C75F',  // Medium lime green (#90C75F)
          200: '#719E4A',  // Warm olive green (#719E4A)
          300: '#547736',  // Dark olive green (#547736)
          400: '#395223',  // Very dark olive (#395223)
        },
        // Neutral grays (from palette Row 4)
        'neutral': {
          50: '#F7F7F7',   // Very light gray (#F7F7F7)
          100: '#CFCFCF',  // Light gray (#CFCFCF)
          200: '#A7A7A7',  // Medium-light gray (#A7A7A7)
          300: '#828282',  // Medium gray (#828282)
          400: '#6E6E6E',  // Dark gray (#6E6E6E)
          500: '#303D3D',  // Very dark gray (#303D3D)
          600: '#1F1F1F',  // Near black (#1F1F1F)
        },
        // Cool grays (from palette Row 8)
        'cool': {
          50: '#DCE3DC',   // Very light cool gray (#DCE3DC)
          100: '#B4BCB4',  // Light cool gray (#B4BCB4)
          200: '#8F958F',  // Medium cool gray (#8F958F)
          300: '#6B706B',  // Dark cool gray (#6B706B)
          400: '#4A4D4A',  // Very dark cool gray (#4A4D4A)
          500: '#2B2D2B',  // Deep cool gray (#2B2D2B)
          600: '#101110',  // Almost black cool gray (#101110)
        },
        // Legacy emerald support (mapped to new green palette for backward compatibility)
        'emerald': {
          50: '#D3FBD6',
          100: '#76EFB2',
          200: '#5FC369',
          300: '#499951',
          400: '#53A551',
          500: '#579D47',
          600: '#34713A',
          700: '#3D7D3C',
          800: '#285627',
          900: '#214C25',
          950: '#153314',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
