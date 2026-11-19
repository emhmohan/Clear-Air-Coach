// Flat config. Kept dependency-free: run with `npx eslint@9 .`
const node = { require: 'readonly', module: 'writable', process: 'readonly', __dirname: 'readonly', console: 'readonly', Buffer: 'readonly', fetch: 'readonly', URL: 'readonly', AbortSignal: 'readonly', TextDecoder: 'readonly', setTimeout: 'readonly', setInterval: 'readonly', clearTimeout: 'readonly' };
const browser = { window: 'readonly', document: 'readonly', navigator: 'readonly', localStorage: 'readonly', location: 'readonly', fetch: 'readonly', URL: 'readonly', Image: 'readonly', Event: 'readonly', File: 'readonly', DataTransfer: 'readonly', Notification: 'readonly', SpeechSynthesisUtterance: 'readonly', speechSynthesis: 'readonly', matchMedia: 'readonly', setTimeout: 'readonly', setInterval: 'readonly', TextDecoder: 'readonly', console: 'readonly', self: 'readonly', caches: 'readonly', clients: 'readonly', Promise: 'readonly' };
const rules = { eqeqeq: ['error', 'always', { null: 'ignore' }], 'no-var': 'error', 'prefer-const': 'warn', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }], 'no-eval': 'error', 'no-implied-eval': 'error' };
module.exports = [
  { ignores: ['node_modules/**'] },
  { files: ['**/*.js'], languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: node }, rules: { ...rules, 'no-undef': 'error' } },
  // browser scripts share globals across files (app.js defines $, state, api...; features.js uses them)
  { files: ['public/**/*.js'], languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: browser }, rules: { ...rules, 'no-undef': 'off', 'no-unused-vars': 'off' } },
];
