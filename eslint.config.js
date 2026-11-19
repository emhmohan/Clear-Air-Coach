// Flat config. Dependency-free: run with `npx eslint@9 .`
const nodeGlobals = {
  require: 'readonly',
  module: 'writable',
  process: 'readonly',
  __dirname: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  AbortSignal: 'readonly',
  TextDecoder: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  clearTimeout: 'readonly',
};
const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  location: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  Image: 'readonly',
  Notification: 'readonly',
  SpeechSynthesisUtterance: 'readonly',
  speechSynthesis: 'readonly',
  matchMedia: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  TextDecoder: 'readonly',
  console: 'readonly',
  Date: 'readonly',
};
const serviceWorkerGlobals = {
  self: 'readonly',
  caches: 'readonly',
  fetch: 'readonly',
  location: 'readonly',
  URL: 'readonly',
  Promise: 'readonly',
};

const rules = {
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
  'no-undef': 'error',
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-shadow': 'warn',
  'consistent-return': 'warn',
  complexity: ['warn', 12],
  'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
};

module.exports = [
  { ignores: ['node_modules/**'] },
  { files: ['**/*.js'], languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: nodeGlobals }, rules },
  {
    files: ['public/js/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: browserGlobals },
    rules,
  },
  { files: ['test/**/*.js'], rules: { 'consistent-return': 'off', 'max-lines-per-function': 'off' } },
  {
    files: ['public/sw.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: serviceWorkerGlobals },
    rules,
  },
];
