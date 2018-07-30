// @flow
import Lab from "lab"
import assert from "assert"
import { log } from "console"
import { add } from "./"

const lab = Lab.script()
const { it } = lab

it("test", function (): void {
  assert.strictEqual(add(1, 2), 3)
})

log("lab-babel:true")

export { lab }
