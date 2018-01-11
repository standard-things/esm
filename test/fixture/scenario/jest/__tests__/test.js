"use strict"

test("jest", () => {
  expect(require("../index.js")).toBe("JEST_GLOBAL_VALUE")
})
