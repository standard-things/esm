"use strict"

test("test", () => {
  expect(() => require("../")).toThrow(/Missing export 'CIRCULAR_EXPORT'/)
})
