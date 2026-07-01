import js from '@eslint/js';
import globals from 'globals';

// Lints the web/Electron JavaScript. The mobile app (its own TS toolchain) and
// the Supabase edge functions (deno lint) are handled separately, so they are
// ignored here.
export default [
  {
    ignores: [
      'node_modules/**',
      'mobile/**',
      'supabase/**',
      'logo.png',
    ],
  },

  js.configs.recommended,

  // Browser ES modules (the renderer and its feature modules).
  {
    files: ['renderer.js', 'modules/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        Chart: 'readonly',
        supabase: 'readonly',
        supabaseClient: 'readonly',
      },
    },
  },

  // Classic browser scripts loaded via <script> (not modules).
  {
    files: ['supabaseConfig.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
        supabase: 'readonly',
      },
    },
  },

  // Service worker.
  {
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: { ...globals.serviceworker },
    },
  },

  // Electron main / preload (Node CommonJS).
  {
    files: ['index.js', 'preload.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  // Node test files and this config.
  {
    files: ['test/**/*.mjs', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Project-wide rule tweaks. Unused *arguments* are common in event handlers
  // and callbacks here; flag unused variables but allow deliberately-ignored
  // args (and error bindings in catch blocks).
  {
    rules: {
      'no-unused-vars': [
        'error',
        { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
