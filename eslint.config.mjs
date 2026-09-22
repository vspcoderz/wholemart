import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // Vendored Untitled UI primitives (upstream style, do not edit):
    "src/components/base/**",
    "src/components/application/**",
    "src/components/foundations/**",
    "src/components/shared-assets/**",
    "src/hooks/**",
    "src/utils/**",
  ]),
]);

export default eslintConfig;
