import assert from "assert"
import def from "../../fixture/export/def.js"

export function check() {
  assert.deepEqual(def, { d: "d", e: "e", f: "f" })
}
