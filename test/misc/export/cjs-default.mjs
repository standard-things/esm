import assert from "assert"
import def from "../../fixture/export/def.js"

export default function () {
  assert.deepEqual(def, { d: "d", e: "e", f: "f" })
}
