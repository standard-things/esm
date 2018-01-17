"use strict"

test("test", () => {
  expect(require("../index.js")).toBe("JEST_GLOBAL_VALUE")
})
