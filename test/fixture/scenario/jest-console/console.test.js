"use strict"

const { log } = console

test("test", () => {
  expect(() => log("")).not.toThrow()
})
