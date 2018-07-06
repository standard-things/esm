"use strict"

test("test", () => {
  expect(() => require("./")).toThrow(/'CIRCULAR_EXPORT'/)
})
