import assert from "assert"
import makeRequire from "../../"

export default () => {
  const packageSymbol = Symbol.for("esm\u200D:package")

  assert.strictEqual(makeRequire[packageSymbol], true)
}
