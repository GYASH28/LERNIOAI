import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const reactHooksPlugin = nextCoreWebVitals
  .map((config) => config.plugins?.['react-hooks'])
  .find(Boolean);

if (!reactHooksPlugin) {
  throw new Error('eslint-config-next did not expose the react-hooks plugin.');
}

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/prefer-as-const': 'off',
      '@typescript-eslint/no-unused-disable-directive': 'off',

      // Keep the React 19 correctness rules active instead of disabling them
      // to reduce the warning count. These warnings are tracked as repair debt.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',

      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'off',

      'prefer-const': 'warn',
      'no-unused-vars': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-empty': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-case-declarations': 'off',
      'no-fallthrough': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-redeclare': 'error',
      'no-undef': 'off',
      'no-unreachable': 'error',
      'no-useless-escape': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'examples/**',
      'skills/**',
      'scripts/seed.ts',
      'scripts/seed-coding.ts',
      'mini-services/**',
    ],
  },
];

export default eslintConfig;
