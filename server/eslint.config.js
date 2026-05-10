const globals = require("globals");
const pluginJs = require("@eslint/js");

module.exports = [
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: "latest",
      sourceType: "commonjs"
    }
  },
  pluginJs.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["warn"],
      "no-console": "off",
      "no-undef": "error"
    }
  }
];
