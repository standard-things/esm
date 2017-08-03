"use strict"

const NODE_ENV = String(process.env.NODE_ENV)
const isTest = NODE_ENV.endsWith("test")

module.exports = {
  extends: ["eslint:recommended", "plugin:import/errors"],
  parser: "eslint-plugin-import/memo-parser",
  root: true,
  env: {
    es6: true,
    mocha: true,
    node: true
  },
  globals: {
    __non_webpack_filename__: false,
    __non_webpack_module__: false
  },
  parserOptions: {
    ecmaVersion: 8,
    parser: "babel-eslint"
  },
  rules: {
    "arrow-parens": "error",
    "arrow-spacing": "error",
    "brace-style": ["error", "1tbs"],
    "comma-dangle": "error",
    "consistent-return": "error",
    curly: "error",
    "eol-last": "error",
    "import/no-anonymous-default-export": "error",
    "import/no-duplicates": "error",
    "import/no-extraneous-dependencies": ["error", { packageDir: "./" }],
    "import/prefer-default-export": "error",
    "keyword-spacing": "error",
    "lines-around-comment": ["error", { allowBlockStart: true, beforeBlockComment: true, beforeLineComment: true }],
    "no-console": isTest ? "off" : "error",
    "no-constant-condition": ["error", { checkLoops: false }],
    "no-empty": ["error", { allowEmptyCatch: true }],
    "no-multiple-empty-lines": ["error", { max: 1 }],
    "no-trailing-spaces": "error",
    "no-undef": "error",
    "no-undefined": "error",
    "no-unused-vars": "error",
    "no-useless-rename": "error",
    "no-var": "error",
    "one-var": ["error", "never"],
    "rest-spread-spacing": "error",
    semi: ["error", "never"],
    "sort-imports": "error",
    "sort-keys": ["error", "asc", { caseSensitive: true, natural: true }],
    "sort-vars": "error",
    "space-before-function-paren": ["error", { named: "never" }],
    "space-infix-ops": "error",
    "spaced-comment": ["error", "always", { block: { balanced: true } }],
    strict: "error",
    "quote-props": ["error", "consistent-as-needed"],
    quotes: ["error", "double", { allowTemplateLiterals: true, avoidEscape: true }]
  }
}
