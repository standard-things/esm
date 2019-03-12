"use strict"

test("test", () => {
  const expected = {
    CJS_JEST_CONFIG_GLOBAL_PROP: "JEST_CONFIG_GLOBAL_VALUE",
    CJS_JEST_CONFIG_GLOBAL_VAR: "JEST_CONFIG_GLOBAL_VALUE",
    ESM_JEST_CONFIG_GLOBAL_PROP: "JEST_CONFIG_GLOBAL_VALUE",
    ESM_JEST_CONFIG_GLOBAL_VAR: "JEST_CONFIG_GLOBAL_VALUE"
  }

  expect(require("./")).toEqual(expected)

  require = require("../../../../index.js")(module)

  expect(require("./main.js")).toEqual(expected)
})
