module.exports = {
  extends: ["plugin:import/errors"],
  parser: "babel-eslint",
  env: {
    es6: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 8
  },
  rules: {
    "no-unused-vars": 2
  }
}
