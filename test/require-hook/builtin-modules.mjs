import assert from "assert"
import makeRequire from "../../"
import module from "../module.js"
import require from "../require"

export default () => {
  const esmRequire = makeRequire(module)
  const requiredAsseert = esmRequire("assert")

  assert.strictEqual(requiredAsseert, assert)
  assert.strictEqual(requiredAsseert, require("assert"))
}
