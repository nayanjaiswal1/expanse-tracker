export default {
  rules: {
    // noop rule to satisfy import in eslint.config.js
    'no-raw-button': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'No-op placeholder rule for project',
          recommended: false,
        },
        schema: [],
      },
      create() {
        return {};
      },
    },
  },
};
