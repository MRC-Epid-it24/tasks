module.exports = {
  root: true,
  env: {
    browser: false,
    commonjs: true,
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  settings: {
    'import/extensions': ['.ts'],
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      node: {
        extensions: ['.ts'],
      },
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  extends: ['airbnb-base', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  plugins: ['import', 'prettier', '@typescript-eslint'],
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'warn',
    'no-debugger': 'warn',
    'no-plusplus': 'off',
    'no-continue': 'off',
    'no-await-in-loop': 'off',
    'no-restricted-syntax': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'warn',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        ts: 'never',
      },
    ],
  },
};
