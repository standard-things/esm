"use strict"

test("test", () => {
  expect(require("../")).toEqual({
    JEST_ENV: "JEST_ENV_VALUE",
    JEST_GLOBAL: "JEST_GLOBAL_VALUE"
  })
})
