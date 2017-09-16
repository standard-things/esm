import assert from "assert"
import def from "../../fixture/export/def.js"

export default () => {
  assert.deepEqual(def, { d: "d", e: "e", f: "f" })
}
