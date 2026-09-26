import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Architecture rules from CLAUDE.md: the sim core stays pure and deterministic.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'setTimeout',
        'setInterval',
        'requestAnimationFrame',
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG in src/sim/rng.ts.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'The sim has no wall clock; use game time.',
        },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['**/ui/**', '**/platform/**'] },
      ],
    },
  },
)
