import assert from "assert"
import def from "../../fixture/export/def.js"

export default () => {
  assert.deepStrictEqual(def, { d: "d", e: "e", f: "f" })
}
