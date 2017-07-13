module.exports = {
  extends: ["plugin:import/errors"],
  plugins: ["import"],
  env: {
    es6: true,
    node: true
  },
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 8,
    sourceType: "module",
    ecmaFeatures: {
      impliedStrict: true
    }
  },
  rules: {
    "no-unused-vars": 2
  }
}
