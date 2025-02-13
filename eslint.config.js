import antfu from '@antfu/eslint-config';

export default await antfu(
  {
    stylistic: {
      semi: true,
    },
    markdown: false,
    formatters: true,
  },
  {
    rules: {
      'import/order': 'off',
      'no-console': 'off',
      'unused-imports/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'jsdoc/require-returns-description': 'off',
      'perfectionist/sort-imports': ['error', {
        groups: [
          'type',
          ['parent-type', 'sibling-type', 'index-type'],

          'builtin',
          'external',
          ['internal', 'internal-type'],
          ['parent', 'sibling', 'index'],
          'side-effect',
          'object',
          'unknown',
        ],
        internalPattern: ['^@/.*'],
        newlinesBetween: 'ignore',
        order: 'asc',
        type: 'natural',
      }],
      'style/quote-props': ['error', 'as-needed'],
      'style/member-delimiter-style': [
        'error',
        { multiline: { delimiter: 'semi' }, singleline: { delimiter: 'semi' } },
      ],
      'ts/consistent-type-definitions': 'off',
    },
  },
);
