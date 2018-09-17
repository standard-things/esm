import assert from "assert"
import ext from "../../fixture/cjs/ext/priority"

export default () => {
  assert.strictEqual(ext, ".js")
}
