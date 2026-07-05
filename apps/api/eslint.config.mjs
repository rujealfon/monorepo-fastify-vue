import createConfig from "@tech-full-stack/eslint-config/create-config";
import drizzle from "eslint-plugin-drizzle";

export default createConfig({
  ignores: ["src/db/migrations/*", "public/*", "*.md"],
  plugins: { drizzle },
  rules: {
    ...drizzle.configs.recommended.rules,
  },
});
