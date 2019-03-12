"use strict"

const hasGlobalURL =
  typeof global.URL === "function" &&
  typeof global.URLSearchParams === "function"

test("test", () => {
  const array = []
  const boolean = true
  const date = new Date
  const number = 1
  const object = {}
  const regexp = /a/
  const string = "a"

  const instances = [
    [() => array instanceof Array],
    [() => boolean instanceof Boolean],
    [() => date instanceof Date],
    [() => number instanceof Number],
    [() => object instanceof Object],
    [() => regexp instanceof RegExp],
    [() => string instanceof String]
  ]

  for (const pair of instances) {
    pair.push(pair[0]())
  }

  const arrayNames = [
    "CJS_STRUCTURED_STACK_TRACE",
    "ESM_STRUCTURED_STACK_TRACE"
  ]

  const funcNames = [
    "CJS_BUFFER_PROP",
    "CJS_BUFFER_VAR",
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
    "ESM_SET_TIMEOUT_VAR"
  ]

  const objectNames = [
    "CJS_PROCESS_PROP",
    "CJS_PROCESS_VAR",
    "ESM_PROCESS_PROP",
    "ESM_PROCESS_VAR"
  ]

  const urlNames = [
    "CJS_URL_PROP",
    "CJS_URL_SEARCH_PARAMS_PROP",
    "CJS_URL_SEARCH_PARAMS_VAR",
    "CJS_URL_VAR",
    "ESM_URL_PROP",
    "ESM_URL_SEARCH_PARAMS_PROP",
    "ESM_URL_SEARCH_PARAMS_VAR",
    "ESM_URL_VAR"
  ]

  const expectedValues = {
    CJS_BUILTIN_PROTOTYPE_MODIFICATION: true,
    CJS_JEST_GLOBAL_VAR: "JEST_GLOBAL_VALUE",
    CJS_JEST_GLOBAL_PROP: "JEST_GLOBAL_VALUE",
    CJS_OBJECT_CONSTRUCTOR: true,
    CJS_OBJECT_CONSTRUCTOR_INSTANCE: true,
    CJS_OBJECT_LITERAL_INSTANCE: true,
    ESM_BUILTIN_PROTOTYPE_MODIFICATION: true,
    ESM_JEST_GLOBAL_VAR: "JEST_GLOBAL_VALUE",
    ESM_JEST_GLOBAL_PROP: "JEST_GLOBAL_VALUE",
    ESM_OBJECT_CONSTRUCTOR: true,
    ESM_OBJECT_CONSTRUCTOR_INSTANCE: true,
    ESM_OBJECT_LITERAL_INSTANCE: true
  }

  function checkInstances() {
    for (const [tester, expected] of instances) {
      expect(tester()).toBe(expected)
    }
  }

  function checkTypes(actual) {
    for (const name of arrayNames) {
      expect(Array.isArray(actual[name])).toBe(true)
    }

    for (const name of funcNames) {
      expect(typeof actual[name]).toBe("function")
    }

    for (const name of objectNames) {
      const value = actual[name]
      const result = typeof value === "object" && value !== null

      expect(result).toBe(true)
    }

    const expected = hasGlobalURL ? "function" : "undefined"

    for (const name of urlNames) {
      expect(typeof actual[name]).toBe(expected)
    }
  }

  function checkValues(actual) {
    const names = Object.keys(expectedValues)

    for (const name of names) {
      expect(actual[name]).toBe(expectedValues[name])
    }
  }

  checkInstances()

  const bridged = require("./")

  checkInstances()
  checkTypes(bridged)
  checkValues(bridged)

  require = require("../../../../index.js")(module)

  const rebridged = require("./main.js")

  checkInstances()
  checkTypes(rebridged)
  checkValues(rebridged)
})
