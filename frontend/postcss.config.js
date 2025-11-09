import process from 'node:process';

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          colormin: true,
          minifyFontValues: true,
          minifySelectors: true,
          reduceIdents: false, // Preserve animation names
          zindex: false, // Don't modify z-index values
        }],
      },
    } : {}),
  },
};
