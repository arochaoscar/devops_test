/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: "server",
      testMatch: [
        "<rootDir>/src/lib/**/*.test.ts",
        "<rootDir>/src/app/**/*.test.ts",
      ],
      testEnvironment: "node",
      preset: "ts-jest",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
    },
    {
      displayName: "client",
      testMatch: ["<rootDir>/src/components/**/*.test.tsx"],
      testEnvironment: "jsdom",
      preset: "ts-jest",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
    },
  ],
};
