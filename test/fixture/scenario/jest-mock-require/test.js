"use strict"

test("test", () => {
  const expected = {
    default: true
  }

  expect(require("./")).toEqual(expected)

  require = require("../../../../")(module)

  expect(require("./main.mjs")).toEqual(expected)
})
