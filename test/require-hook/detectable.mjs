import assert from "assert"
import makeRequire from "../../"

export default () => {
  assert.strictEqual(makeRequire[Symbol.for("esm:package")], true)
}
