import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      typography: ({ theme }) => ({
        invert: {
          css: {
            '--tw-prose-body': theme('colors.gray.200'),
            '--tw-prose-headings': theme('colors.white'),
            p: {
              fontSize: theme('fontSize.lg')[0],
              lineHeight: theme('lineHeight.8'),
            },
            li: {
              fontSize: theme('fontSize.lg')[0],
              lineHeight: theme('lineHeight.8'),
            },
            strong: {
              fontSize: theme('fontSize.xl')[0],
            },
            img: {
              borderRadius: theme('borderRadius.xl'),
              marginTop: theme('spacing.4'),
              marginBottom: theme('spacing.4'),
            },
            h1: {
              fontSize: theme('fontSize.4xl')[0],
              lineHeight: theme('lineHeight.9'),
            },
            h2: {
              fontSize: theme('fontSize.3xl')[0],
              lineHeight: theme('lineHeight.9'),
            },
            h3: {
              fontSize: theme('fontSize.2xl')[0],
              lineHeight: theme('lineHeight.9'),
            },
            h4: {
              fontSize: theme('fontSize.xl')[0],
            },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
