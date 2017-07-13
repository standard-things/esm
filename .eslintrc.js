module.exports = {
  extends: ["plugin:import/errors"],
  parser: "eslint-plugin-import/memo-parser",
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
    "no-undef": "error",
    "no-unused-vars": "error",
    strict: "error"
  }
}
