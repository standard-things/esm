"use strict"

test("test", () => {
  const URL_TYPE = typeof URL
  const URL_SEARCH_PARAMS = typeof URLSearchParams

  const expectedTypes = {
    CJS_CLEAR_IMMEDIATE_PROP: "function",
    CJS_CLEAR_IMMEDIATE_VAR: "function",
    CJS_CLEAR_INTERVAL_PROP: "function",
    CJS_CLEAR_INTERVAL_VAR: "function",
    CJS_CLEAR_TIMEOUT_PROP: "function",
    CJS_CLEAR_TIMEOUT_VAR: "function",
    CJS_SET_IMMEDIATE_PROP: "function",
    CJS_SET_IMMEDIATE_VAR: "function",
    CJS_SET_INTERVAL_PROP: "function",
    CJS_SET_INTERVAL_VAR: "function",
    CJS_SET_TIMEOUT_PROP: "function",
    CJS_SET_TIMEOUT_VAR: "function",
    CJS_URL_PROP: URL_TYPE,
    CJS_URL_SEARCH_PARAMS_PROP: URL_SEARCH_PARAMS,
    CJS_URL_SEARCH_PARAMS_VAR: URL_SEARCH_PARAMS,
    CJS_URL_VAR: URL_TYPE,
    ESM_CLEAR_IMMEDIATE_PROP: "function",
    ESM_CLEAR_IMMEDIATE_VAR: "function",
    ESM_CLEAR_INTERVAL_PROP: "function",
    ESM_CLEAR_INTERVAL_VAR: "function",
    ESM_CLEAR_TIMEOUT_PROP: "function",
    ESM_CLEAR_TIMEOUT_VAR: "function",
    ESM_SET_IMMEDIATE_PROP: "function",
    ESM_SET_IMMEDIATE_VAR: "function",
    ESM_SET_INTERVAL_PROP: "function",
    ESM_SET_INTERVAL_VAR: "function",
    ESM_SET_TIMEOUT_PROP: "function",
    ESM_SET_TIMEOUT_VAR: "function",
    ESM_URL_PROP: URL_TYPE,
    ESM_URL_SEARCH_PARAMS_PROP: URL_SEARCH_PARAMS,
    ESM_URL_SEARCH_PARAMS_VAR: URL_SEARCH_PARAMS,
    ESM_URL_VAR: URL_TYPE
  }

  const expectedValues = {
    CJS_JEST_GLOBAL_VAR: "JEST_GLOBAL_VALUE",
    CJS_JEST_GLOBAL_PROP: "JEST_GLOBAL_VALUE",
    ESM_JEST_GLOBAL_VAR: "JEST_GLOBAL_VALUE",
    ESM_JEST_GLOBAL_PROP: "JEST_GLOBAL_VALUE"
  }

  function checkTypes(actual, expected) {
    const names = Object.keys(expected)

    for (const name of names) {
      expect(typeof actual[name]).toBe(expected[name])
    }
  }

  function checkValues(actual, expected) {
    const names = Object.keys(expected)

    for (const name of names) {
      expect(actual[name]).toBe(expected[name])
    }
  }

  const bridged = require("../")

  checkValues(bridged, expectedValues)
  checkTypes(bridged, expectedTypes)

  require = require("../../../../../")(module)

  const rebridged = require("../main.js")

  checkValues(rebridged, expectedValues)
  checkTypes(rebridged, expectedTypes)
})
