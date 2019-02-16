import test from "ava"
import sinon from "sinon"
import reConsole from "./console.js"

test("test", (t) => {
  sinon.spy(console, "log")

  reConsole.log("spy")

  t.is(reConsole.log.callCount, 1)
})
