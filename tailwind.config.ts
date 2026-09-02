import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        subtek: {
          blue: '#0F172A',
          cyan: '#00F0FF',
          accent: '#0284C7',
          dark: '#0B0F19',
          card: '#1E293B',
          gray: '#94A3B8'
        }
      }
    },
  },
  plugins: [],
};
export default config;
