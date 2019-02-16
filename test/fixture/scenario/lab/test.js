import assert from "assert"
import { script } from "lab"
import { add } from "../../math/math.esm.js"

const lab = script()

lab.it("test", () => {
  assert.strictEqual(add(1, 2), 3)
})

export { lab }
