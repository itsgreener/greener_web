import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import eslintConfigPrettier from 'eslint-config-prettier'

// Reglas de capas (auditoría 8 oct 2026, fase 3). Dentro de cada módulo:
//
//   domain         → no conoce a nadie (ni application, ni infrastructure,
//                    ni Next, ni Supabase).
//   application    → solo domain: recibe las implementaciones por parámetro
//                    (`makeX({ puerto })`).
//   infrastructure → implementa los puertos del dominio.
//   container.ts   → único sitio que une application con infrastructure.
//
// Y fuera de los módulos (páginas, acciones, rutas, componentes) solo se
// entra por `container.ts` o por tipos.
//
// Imports: dentro de `src` y `tests` se entra siempre por el alias (`@/…`,
// `@tests/…`, `@root/…`); solo se permite `./` para ficheros de la misma
// carpeta.
const NO_PARENT_IMPORTS = {
  group: ['..', '../*', '../**'],
  message:
    'Usa el alias: `@/…` para src, `@tests/…` para tests, `@root/…` para la raíz.',
}

const NO_FRAMEWORK = [
  {
    group: ['next', 'next/*', 'react', 'react-dom', 'server-only'],
    message: 'Esta capa no depende de Next ni de React.',
  },
  {
    group: ['@/lib/supabase/*', '@supabase/*'],
    message: 'El acceso a datos va en infrastructure, detrás de un puerto.',
  },
]

const layerRules = [
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_PARENT_IMPORTS] }],
    },
  },
  {
    files: ['src/modules/*/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            NO_PARENT_IMPORTS,
            ...NO_FRAMEWORK,
            {
              group: [
                '**/application',
                '**/application/*',
                '**/infrastructure',
                '**/infrastructure/*',
                '**/container',
              ],
              message:
                'El dominio no depende de application ni infrastructure.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/*/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            NO_PARENT_IMPORTS,
            ...NO_FRAMEWORK,
            {
              group: [
                '**/infrastructure',
                '**/infrastructure/*',
                '**/container',
              ],
              message:
                'Application recibe las implementaciones por parámetro; las une container.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/app/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
    ],
    ignores: ['src/lib/supabase/**', 'src/lib/auth/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/modules/*/infrastructure',
                '@/modules/*/infrastructure/*',
                '@/modules/*/application',
                '@/modules/*/application/*',
              ],
              allowTypeImports: true,
              message:
                'Pide lo que necesites a `@/modules/<módulo>/container` (o importa solo tipos).',
            },
            {
              group: [
                '@/lib/supabase/serviceClient',
                '@/lib/supabase/publicReadClient',
              ],
              message: 'El acceso a datos va en infrastructure, no en la UI.',
            },
          ],
        },
      ],
    },
  },
  {
    // Saber qué falló leyendo el texto del error se rompe en cuanto cambia
    // el mensaje: se compara el `kind` del DomainError (ver domainError.ts).
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name=/^(includes|startsWith|endsWith|match)$/][callee.object.property.name='message']",
          message:
            'No decidas por el texto de `error.message`: usa `isDomainError(error, kind)`.',
        },
      ],
    },
  },
]

// Orden de imports (auditoría TSX, ADM-F1/F2, PUB-F1, TSX-X4): primero lo que
// no es nuestro (`react`, `next/*`, paquetes), luego el alias `@/…` y por
// último lo de la misma carpeta (`./…`). Una línea en blanco tras el último
// import. Los imports de efectos (`import './globals.css'`) no se ordenan.
const importOrderRules = [
  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          pathGroups: [
            { pattern: '@/**', group: 'internal' },
            { pattern: '@tests/**', group: 'internal' },
            { pattern: '@root/**', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'ignore',
        },
      ],
      'import/newline-after-import': 'error',
    },
  },
]

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  ...layerRules,
  ...importOrderRules,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generado por `npm run db:types`.
    'src/lib/supabase/database.types.ts',
  ]),
])

export default eslintConfig
