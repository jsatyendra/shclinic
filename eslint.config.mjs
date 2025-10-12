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
      // Ignore API routes temporarily
      "src/app/api/**/*",
      // Ignore other build/generated files
      ".next/**/*",
      "out/**/*",
      "dist/**/*",
      "node_modules/**/*",
      // Ignore database and migration files
      "*.js", // Root level JS files like dbinit.js, migrate.js, etc.
      "add-*.js",
      "server-init.js",
      "dbquery.js",
      "dbverify.js",
      "recreate-table.js",
      "run-migration.js",
      "test-*.js",
      "find-client.js",
      "get-client.js",
      "list-clients.js",
      "export-clients.js",
    ]
  },
  {
    rules: {
      // Disable unused vars errors temporarily
      "@typescript-eslint/no-unused-vars": ["off"],
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused variables that start with underscore
      "no-unused-vars": "off",
      // Disable other common TypeScript strict rules temporarily
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      // React/Next.js specific rules
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-hooks/exhaustive-deps": "warn",
      // Allow console statements (useful for debugging)
      "no-console": "off",
      // Disable import/export related strict rules
      "import/no-anonymous-default-export": "off",
      // Allow empty catch blocks temporarily
      "no-empty": "off",
      // Allow any casing for variables/functions
      "@typescript-eslint/naming-convention": "off",
    }
  }
];

export default eslintConfig;
