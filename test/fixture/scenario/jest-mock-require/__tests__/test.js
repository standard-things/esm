"use strict"

test("test", () => {
  expect(require("../")).toBe("JEST_GLOBAL_VALUE")
})
