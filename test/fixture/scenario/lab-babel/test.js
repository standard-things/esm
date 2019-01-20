// @flow
import assert from "assert"
import { log } from "console"
import { script } from "lab"
import add from "./add.flow.js"

const lab = script()

lab.it("test", function (): void {
  assert.strictEqual(add(1, 2), 3)
})

log("lab-babel:true")

export { lab }
