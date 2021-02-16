import path from 'path';

const config = {
    testEnvironment: 'jest-environment-jsdom',
    moduleDirectories: [
        'node_modules',
        'test'
    ],
    collectCoverageFrom: ['**/*.js']
};

export default config;
