import assert from "assert"
import def, {
  value,
  exportAgain,
  oneLastExport
} from "../fixture/export/later.js"

export function check(done) {
  assert.strictEqual(def, "default-1")
  assert.strictEqual(value, "value-1")

  exportAgain()
  assert.strictEqual(def, "default-1")
  assert.strictEqual(value, "value-2")

  setImmediate(() => {
    oneLastExport()
    assert.strictEqual(def, "default-1")
    assert.strictEqual(value, "value-3")
    done()
  })
}
