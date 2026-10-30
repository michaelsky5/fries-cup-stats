import account from './eslint.account.config.mjs'

export default [...account, {
  ...account[0],
  rules: { ...account[0].rules,
    // JSX component parameters and explicitly discarded Web-only properties
    // follow the same naming convention as the existing native account lint.
    'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]', caughtErrorsIgnorePattern: '^_' }]
  },
  files: [
    'src/platform.js', 'src/center/pages/PublicPage.jsx',
    'src/shared/{publicScheduleReader,publicSeasonReader,publicSnapshotCache,nativeDesignModel,nativePublicNavigation}.js',
    'src/shared/{nativeDesignRuntime,NativeSourcePage,SharedCenter}.jsx',
    'scripts/{prepare-navigation,prepare-mobile-design,canonical-public-sources}.mjs',
    'tests/{mobile-parity,public-reader,public-snapshot-cache}.test.mjs'
  ]
}]
