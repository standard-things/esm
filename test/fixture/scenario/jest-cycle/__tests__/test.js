"use strict"

test("test", () => {
  expect(() => require("../")).toThrow(/does not provide an export named 'CIRCULAR_EXPORT'/)
})
