module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        module: { type: 'commonjs' },
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@node-rs/argon2$': '<rootDir>/../test/__mocks__/argon2.js',
    '^@prisma/client$': '<rootDir>/../test/__mocks__/prisma-client.js',
    '^@prisma/adapter-pg$': '<rootDir>/../test/__mocks__/prisma-pg.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(@nestjs|reflect-metadata|@node-rs)/)'],
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
  testEnvironment: 'node',
};
