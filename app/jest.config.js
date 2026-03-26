// =============================================================================
// Jest Configuration
// =============================================================================
// Uses two separate projects to handle different test environments:
//
//   "server" — runs in Node.js (testEnvironment: "node")
//     Matches: src/lib/**/*.test.ts, src/app/**/*.test.ts
//     Tests: server actions (actions.test.ts), utilities (recaptcha.test.ts)
//
//   "client" — runs in jsdom (testEnvironment: "jsdom")
//     Matches: src/components/**/*.test.tsx
//     Tests: React components (greeting-form.test.tsx)
//
// Both projects use ts-jest for TypeScript and the @/ path alias
// mapped to src/ for consistency with Next.js imports.
// =============================================================================

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
