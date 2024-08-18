import antfu from '@antfu/eslint-config';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default await antfu(
  {
    stylistic: {
      semi: true,
    },
    markdown: false,
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
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
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^@?\\w.*\\u0000$', '^@?\\w'],
            ['(?<=\\u0000)$', '^'],
            ['^\\..*\\u0000$', '^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'sort-imports': 'off',
      'style/quote-props': ['error', 'as-needed'],
      'style/member-delimiter-style': [
        'error',
        { multiline: { delimiter: 'semi' }, singleline: { delimiter: 'semi' } },
      ],
      'ts/consistent-type-definitions': 'off',
    },
  },
);
