"use strict"

const def = require("../index.js")

test("jest", () => {
  expect(def).toBe("JEST_GLOBAL_VALUE")
})
