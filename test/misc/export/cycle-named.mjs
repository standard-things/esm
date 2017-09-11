import assert from "assert"
import def from "../../fixture/export/cycle-named/a.mjs"

export default function () {
  assert.strictEqual(def, true)
}
