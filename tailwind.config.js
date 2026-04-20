/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        xs: "0.6875rem", // 11px
        sm: "0.75rem", // 12px
        base: "0.8125rem", // 13px
        lg: "0.875rem", // 14px
        xl: "1rem", // 16px
        "2xl": "1.125rem", // 18px
        "3xl": "1.25rem", // 20px
        "4xl": "1.5rem", // 24px
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
        heading: ["Noto Sans", "system-ui", "sans-serif"],
        menu: ["Lato", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#65a30d", // Lime-600 as default for better contrast
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#bef264",
          400: "#a3e635",
          500: "#84cc16",
          600: "#65a30d",
          700: "#4d7c0f",
          800: "#3f6212",
          900: "#365314",
        },
        dark: {
          DEFAULT: "#18181b",
          50: "#2d2d3d",
          100: "#27272e",
          200: "#1f1f29",
          300: "#18181b",
          400: "#141417",
          500: "#101012",
          600: "#0c0c0e",
          700: "#08080a",
          800: "#040406",
          900: "#000000",
        },
      },
      animation: {
        glow: "glow 2s ease-in-out infinite alternate",
        float: "float 3s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(132, 204, 22, 0.2)" },
          "100%": { boxShadow: "0 0 30px rgba(132, 204, 22, 0.4)" },
        },
      },
    },
  },
  plugins: [],
};
