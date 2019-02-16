// @flow
import assert from "assert"
import { script } from "lab"
import add from "./add.flow.js"

const lab = script()

lab.it("test", function (): void {
  assert.strictEqual(add(1, 2), 3)
})

export { lab }
