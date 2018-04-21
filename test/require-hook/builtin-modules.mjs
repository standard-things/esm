import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import require from "../require"

export default () => {
  const esmRequire = makeRequire(module)
  const requiredAssert = esmRequire("assert")

  assert.strictEqual(requiredAssert, assert)
  assert.strictEqual(requiredAssert, require("assert"))
}
