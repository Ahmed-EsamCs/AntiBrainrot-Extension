module.exports = {
  root: true,
  env: { browser: true, es2022: true, webextensions: true },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["react-hooks"],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
};
