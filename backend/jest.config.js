module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/controllers/**/*.js',
        'src/middleware/auth.js',
        'src/middleware/roleAuth.js',
        'src/middleware/validate.js',
        '!**/node_modules/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    verbose: true,
    testTimeout: 10000,
    forceExit: true,
};
