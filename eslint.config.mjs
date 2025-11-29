import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{ts,mts,cts}"], languageOptions: { parser: tseslint.ESLintParser } },
  globalIgnores(["worker-configuration.d.ts", "test/**"]),
  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  eslintConfigPrettier,
  {
    rules: {
      "comma-dangle": ["error", "never"],
      "max-len": ["error", { code: 120, ignoreComments: true }],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/explicit-function-return-type": "error"
    }
  }
]);
