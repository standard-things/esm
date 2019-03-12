"use strict"

test("test", () => {
  const expected = {
    CJS_JEST_ENV: "JEST_ENV_VALUE",
    ESM_JEST_ENV: "JEST_ENV_VALUE"
  }

  expect(require("./")).toEqual(expected)

  require = require("../../../../index.js")(module)

  expect(require("./main.js")).toEqual(expected)
})
