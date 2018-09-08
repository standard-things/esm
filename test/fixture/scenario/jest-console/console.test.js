"use strict"

test("test", () => {
  const { log } = console

  expect(() => log()).not.toThrow()
})
