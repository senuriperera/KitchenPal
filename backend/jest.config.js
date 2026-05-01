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

    // Add the reporters configuration here
    reporters: [
        "default",
        ["jest-html-reporter", {
            "pageTitle": "KitchenPal Backend Test Report",
            "outputPath": "./reports/test-report.html",
            "includeFailureMsg": true,
            "includeConsoleLog": true,
            "theme": "darkTheme", // Optional: looks great for CI reports
            // Ensure report still generates cleanly even on test failures
            "sort": "status"
        }]
    ]
};
