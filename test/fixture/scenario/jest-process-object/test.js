"use strict"

test("test", () => {
  const expected = {
    CJS_JEST_ENV: "JEST_ENV_VALUE",
    ESM_JEST_ENV: "JEST_ENV_VALUE"
  }

  expect(require("./")).toEqual(expected)

  require = require("../../../../")(module)

  expect(require("./main.js")).toEqual(expected)
})
