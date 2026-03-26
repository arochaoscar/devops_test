import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jest from "eslint-plugin-jest";
import testingLibrary from "eslint-plugin-testing-library";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Jest test files
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    ...jest.configs["flat/recommended"],
  },
  // Testing Library (React) test files
  {
    files: ["**/__tests__/**/*.tsx", "**/*.test.tsx"],
    ...testingLibrary.configs["flat/react"],
  },
]);

export default eslintConfig;
