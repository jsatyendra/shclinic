import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**/*",
      "out/**/*",
      "dist/**/*",
      "node_modules/**/*",
      "scripts/**/*",
    ]
  },
  {
    rules: {
      // Warn on unused vars (ignore underscore-prefixed)
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-unused-vars": "off", // defer to @typescript-eslint version
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/prefer-as-const": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-inferrable-types": "off",
      // React/Next.js
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-hooks/exhaustive-deps": "warn",
      // Allow console in API routes; warn elsewhere
      "no-console": "off",
      "import/no-anonymous-default-export": "off",
      "no-empty": "warn",
      "@typescript-eslint/naming-convention": "off",
    }
  }
];

export default eslintConfig;
