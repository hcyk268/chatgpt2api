import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = [
    ...nextCoreWebVitals,
    ...nextTypescript,
    prettier,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': 'off', // do not flag unused variables
            '@typescript-eslint/no-explicit-any': 'off', // allow explicit any
        },
    },
];

export default eslintConfig;
