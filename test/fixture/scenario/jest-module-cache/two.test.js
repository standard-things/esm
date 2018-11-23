"use strict"

test("test", () => {
  expect(require("./").getCount()).toBe(1)

  require = require("../../../../")(module)

  expect(require("./main.js").getCount()).toBe(2)
})
