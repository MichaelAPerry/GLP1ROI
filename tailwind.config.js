const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ground: token('ground'),
        surface: token('surface'),
        sunken: token('sunken'),
        ink: token('ink'),
        ink2: token('ink2'),
        muted: token('muted'),
        line: token('line'),
        accent: token('accent'),
        good: token('good'),
        bad: token('bad'),
        drug: token('drug'),
        med: token('med'),
        total: token('total'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
