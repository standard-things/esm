import Lab from "lab"
import assert from "assert"
import { add } from "./"

const lab = Lab.script()
const { it } = lab

it("test", () => {
  assert.strictEqual(add(1, 2), 3)
})

export { lab }
