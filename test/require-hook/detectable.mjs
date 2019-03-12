import assert from "assert"
import makeRequire from "../../index.js"

export default () => {
  assert.strictEqual(makeRequire[Symbol.for("esm:package")], true)
}
