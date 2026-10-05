/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        ink: "#1E2430",
        inkfaint: "#6B7280",
        line: "#E4E1D8",
        brand: {
          DEFAULT: "#2858D8",
          dark: "#1D40A8",
          light: "#EDF1FC",
        },
        amber: {
          DEFAULT: "#C98A2B",
          light: "#FBF1E1",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
