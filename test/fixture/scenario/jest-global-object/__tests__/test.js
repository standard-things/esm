"use strict"

test("test", () => {
  const expectedValues = {
    CJS_JEST_GLOBAL_VAR: "JEST_GLOBAL_VALUE",
    CJS_JEST_GLOBAL_PROP: "JEST_GLOBAL_VALUE",
    ESM_JEST_GLOBAL_VAR: "JEST_GLOBAL_VALUE",
    ESM_JEST_GLOBAL_PROP: "JEST_GLOBAL_VALUE"
  }

  const funcNames = [
    "CJS_CLEAR_IMMEDIATE_PROP",
    "CJS_CLEAR_IMMEDIATE_VAR",
    "CJS_CLEAR_INTERVAL_PROP",
    "CJS_CLEAR_INTERVAL_VAR",
    "CJS_CLEAR_TIMEOUT_PROP",
    "CJS_CLEAR_TIMEOUT_VAR",
    "CJS_SET_IMMEDIATE_PROP",
    "CJS_SET_IMMEDIATE_VAR",
    "CJS_SET_INTERVAL_PROP",
    "CJS_SET_INTERVAL_VAR",
    "CJS_SET_TIMEOUT_PROP",
    "CJS_SET_TIMEOUT_VAR",
    "CJS_URL_PROP",
    "CJS_URL_SEARCH_PARAMS_PROP",
    "CJS_URL_SEARCH_PARAMS_VAR",
    "CJS_URL_VAR",
    "ESM_CLEAR_IMMEDIATE_PROP",
    "ESM_CLEAR_IMMEDIATE_VAR",
    "ESM_CLEAR_INTERVAL_PROP",
    "ESM_CLEAR_INTERVAL_VAR",
    "ESM_CLEAR_TIMEOUT_PROP",
    "ESM_CLEAR_TIMEOUT_VAR",
    "ESM_SET_IMMEDIATE_PROP",
    "ESM_SET_IMMEDIATE_VAR",
    "ESM_SET_INTERVAL_PROP",
    "ESM_SET_INTERVAL_VAR",
    "ESM_SET_TIMEOUT_PROP",
    "ESM_SET_TIMEOUT_VAR",
    "ESM_URL_PROP",
    "ESM_URL_SEARCH_PARAMS_PROP",
    "ESM_URL_SEARCH_PARAMS_VAR",
    "ESM_URL_VAR"
  ]

  function checkTypes(actual) {
    for (const name of funcNames) {
      expect(typeof actual[name]).toBe("function")
    }
  }

  function checkValues(actual) {
    const names = Object.keys(expectedValues)

    for (const name of names) {
      expect(actual[name]).toBe(expectedValues[name])
    }
  }

  const bridged = require("../")

  checkValues(bridged)
  checkTypes(bridged)

  require = require("../../../../../")(module)

  const rebridged = require("../main.js")

  checkValues(rebridged)
  checkTypes(rebridged)
})
