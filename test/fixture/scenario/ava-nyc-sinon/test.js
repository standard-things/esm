import test from "ava"
import sinon from "sinon"
import log from "./log.js"

test("test", (t) => {
  sinon.spy(console, "log")

  log("a")

  t.is(console.log.callCount, 1)
})
