import { defineConfig, globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import reactPlugin from "eslint-plugin-react";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    plugins: {
      react: reactPlugin,
    },
    rules: {
      "react/jsx-one-expression-per-line": ["error", { allow: "none" }],
      "react/jsx-indent": ["error", 2],
      "react/jsx-closing-tag-location": "error",
      "react/jsx-wrap-multilines": [
        "error",
        {
          return: "parens-new-line",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
